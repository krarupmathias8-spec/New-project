import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processNextJobs, recoverStuckJobs } from './runner';
import { prisma } from '@/lib/prisma';
import * as processor from './processor';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $executeRaw: vi.fn(),
    $transaction: vi.fn((cb) => cb({ $queryRaw: vi.fn() })),
    job: {
      update: vi.fn(),
    },
  },
}));

// Mock processor functions
vi.mock('./processor', () => ({
  runIngestionJob: vi.fn(),
  runGenerationJob: vi.fn(),
  runImagesJob: vi.fn(),
}));

describe('Job Runner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recoverStuckJobs', () => {
    it('should call executeRaw twice to recover stuck jobs', async () => {
      await recoverStuckJobs();
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
    });
  });

  describe('processNextJobs', () => {
    it('should claim and process a job successfully', async () => {
      // Mock claiming a job
      const mockJob = {
        id: 'job-1',
        type: 'INGESTION',
        payload: { ingestionRunId: 'run-1' },
        attempts: 1,
        maxAttempts: 3,
      };

      // Mock the transaction result
      (prisma.$transaction as any).mockImplementationOnce(async (callback: any) => {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([mockJob]),
        };
        return await callback(tx);
      });

      await processNextJobs();

      expect(processor.runIngestionJob).toHaveBeenCalledWith({ ingestionRunId: 'run-1' });
      expect(prisma.job.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { status: 'SUCCEEDED' },
      });
    });

    it('should handle failed job and retry if attempts < maxAttempts', async () => {
      const mockJob = {
        id: 'job-1',
        type: 'INGESTION',
        payload: { ingestionRunId: 'run-1' },
        attempts: 1,
        maxAttempts: 3,
      };

      (prisma.$transaction as any).mockImplementationOnce(async (callback: any) => {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([mockJob]),
        };
        return await callback(tx);
      });

      // Mock failure
      (processor.runIngestionJob as any).mockRejectedValue(new Error('Processing failed'));

      await processNextJobs();

      expect(prisma.job.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'job-1' },
        data: expect.objectContaining({
          status: 'QUEUED', // Should retry
          lastError: expect.stringContaining('Processing failed'),
        }),
      }));
    });

    it('should mark job as FAILED if maxAttempts reached', async () => {
      const mockJob = {
        id: 'job-1',
        type: 'INGESTION',
        payload: { ingestionRunId: 'run-1' },
        attempts: 3, // Already at max (this would be attempts BEFORE increment in real DB, but logic here uses passed value)
        // Wait, the SQL query increments attempts.
        // In the test mock, we return the value AFTER the update usually, but let's assume
        // the claimed job has attempts=3 and maxAttempts=3.
        maxAttempts: 3,
      };

      (prisma.$transaction as any).mockImplementationOnce(async (callback: any) => {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([mockJob]),
        };
        return await callback(tx);
      });

      (processor.runIngestionJob as any).mockRejectedValue(new Error('Processing failed'));

      await processNextJobs();

      expect(prisma.job.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'job-1' },
        data: expect.objectContaining({
          status: 'FAILED', // Should fail permanently
        }),
      }));
    });
  });
});
