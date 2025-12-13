import { Queue } from "bullmq";
import IORedis from "ioredis";

import { getEnv } from "@/lib/env";

export const QUEUE_NAMES = {
  ingestion: "ingestion",
  generation: "generation",
  images: "images",
} as const;

function getRedis() {
  const { REDIS_URL } = getEnv();
  if (!REDIS_URL) throw new Error("Missing REDIS_URL");
  return new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export function getQueues() {
  const connection = getRedis();
  return {
    connection,
    ingestionQueue: new Queue(QUEUE_NAMES.ingestion, { connection }),
    generationQueue: new Queue(QUEUE_NAMES.generation, { connection }),
    imagesQueue: new Queue(QUEUE_NAMES.images, { connection }),
  };
}

