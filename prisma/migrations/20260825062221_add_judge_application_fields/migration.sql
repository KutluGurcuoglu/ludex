-- AlterTable
ALTER TABLE "User" ADD COLUMN     "academicProfileUrl" TEXT,
ADD COLUMN     "customExpertiseTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "cvFileName" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "expertiseArea" TEXT,
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "judgeAgreementAcceptedAt" TIMESTAMP(3);
