import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export async function enqueueJob(args: {
  type: "INGESTION" | "GENERATION" | "IMAGES";
  payload: Prisma.InputJsonValue;
}) {
  return await prisma.job.create({
    data: {
      type: args.type,
      payload: args.payload,
      status: "QUEUED",
    },
    select: { id: true, type: true, status: true, createdAt: true },
  });
}

