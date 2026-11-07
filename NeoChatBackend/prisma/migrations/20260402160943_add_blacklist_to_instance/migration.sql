-- AlterTable
ALTER TABLE "Instance" ADD COLUMN     "blacklist" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "isBotActive" SET DEFAULT false;
