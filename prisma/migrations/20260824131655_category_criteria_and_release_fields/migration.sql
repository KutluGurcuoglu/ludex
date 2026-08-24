-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "criteria" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "evaluationDeadline" TIMESTAMP(3),
ADD COLUMN     "resultsReleaseAt" TIMESTAMP(3),
ADD COLUMN     "resultsReleasedAt" TIMESTAMP(3);
