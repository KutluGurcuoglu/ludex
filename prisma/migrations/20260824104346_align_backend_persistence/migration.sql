-- CreateEnum
CREATE TYPE "JudgeWorkStatus" AS ENUM ('WORKING', 'STUDYING', 'BOTH');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "DisqualificationDecision" AS ENUM ('UPHELD', 'DISMISSED');

-- AlterEnum
BEGIN;
CREATE TYPE "ReportStatus_new" AS ENUM ('PENDING_ASSIGNMENT', 'ASSIGNED', 'IN_REVIEW', 'COMPLETED', 'DISQUALIFIED');
ALTER TABLE "public"."Report" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Report" ALTER COLUMN "status" TYPE "ReportStatus_new" USING ("status"::text::"ReportStatus_new");
ALTER TYPE "ReportStatus" RENAME TO "ReportStatus_old";
ALTER TYPE "ReportStatus_new" RENAME TO "ReportStatus";
DROP TYPE "public"."ReportStatus_old";
ALTER TABLE "Report" ALTER COLUMN "status" SET DEFAULT 'PENDING_ASSIGNMENT';
COMMIT;

-- DropForeignKey
ALTER TABLE "CategoryDocument" DROP CONSTRAINT "CategoryDocument_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "CriterionScore" DROP CONSTRAINT "CriterionScore_criterionId_fkey";

-- DropForeignKey
ALTER TABLE "EvaluationCriterion" DROP CONSTRAINT "EvaluationCriterion_templateVersionId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_assignedJudgeId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_templateId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_templateVersionId_fkey";

-- DropForeignKey
ALTER TABLE "ReportTemplate" DROP CONSTRAINT "ReportTemplate_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "TemplateSection" DROP CONSTRAINT "TemplateSection_templateVersionId_fkey";

-- DropForeignKey
ALTER TABLE "TemplateVersion" DROP CONSTRAINT "TemplateVersion_templateId_fkey";

-- DropIndex
DROP INDEX "Report_assignedJudgeId_idx";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "evaluationCriteria" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "reportTemplate" JSONB,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "specification" JSONB,
ADD COLUMN     "submissionClosesAt" TIMESTAMP(3),
ADD COLUMN     "submissionOpensAt" TIMESTAMP(3),
ADD COLUMN     "templateSections" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "CriterionScore" ADD COLUMN     "comment" TEXT;

-- AlterTable
ALTER TABLE "JudgeEvaluation" DROP COLUMN "comment",
DROP COLUMN "createdAt",
ADD COLUMN     "disqualificationAdminDecidedAt" TIMESTAMP(3),
ADD COLUMN     "disqualificationAdminDecision" "DisqualificationDecision",
ADD COLUMN     "disqualificationDecidedAt" TIMESTAMP(3),
ADD COLUMN     "disqualificationEvidenceId" TEXT,
ADD COLUMN     "disqualificationFindingId" TEXT,
ADD COLUMN     "disqualificationFindingText" TEXT,
ADD COLUMN     "disqualificationRuleText" TEXT,
ADD COLUMN     "overallComment" TEXT NOT NULL,
ADD COLUMN     "status" "EvaluationStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "visibleToContestant" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Report" DROP COLUMN "assignedJudgeId",
DROP COLUMN "createdAt",
DROP COLUMN "fileUrl",
DROP COLUMN "mimeType",
DROP COLUMN "templateId",
DROP COLUMN "templateVersionId",
DROP COLUMN "updatedAt",
ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "extractedText" TEXT,
ADD COLUMN     "r2Key" TEXT NOT NULL,
ADD COLUMN     "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "status" SET DEFAULT 'PENDING_ASSIGNMENT';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "judgeApprovalStatus" "ApplicationStatus",
ADD COLUMN     "judgeWorkStatus" "JudgeWorkStatus",
ADD COLUMN     "phone" TEXT NOT NULL;

-- DropTable
DROP TABLE "CategoryDocument";

-- DropTable
DROP TABLE "EvaluationCriterion";

-- DropTable
DROP TABLE "ReportTemplate";

-- DropTable
DROP TABLE "TemplateSection";

-- DropTable
DROP TABLE "TemplateVersion";

-- CreateTable
CREATE TABLE "ScoreCriterion" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportJudgeAssignment" (
    "reportId" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportJudgeAssignment_pkey" PRIMARY KEY ("reportId","judgeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScoreCriterion_label_key" ON "ScoreCriterion"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- AddForeignKey
ALTER TABLE "ReportJudgeAssignment" ADD CONSTRAINT "ReportJudgeAssignment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportJudgeAssignment" ADD CONSTRAINT "ReportJudgeAssignment_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CriterionScore" ADD CONSTRAINT "CriterionScore_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "ScoreCriterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

