import { CreativeType, ImageFormat } from "@/generated/prisma";

export type IngestionJobPayload = {
  ingestionRunId: string;
};

export type GenerationJobPayload = {
  generationRunId: string;
  type: CreativeType;
};

export type ImageJobPayload = {
  generationRunId: string;
  formats: ImageFormat[];
};

