-- AlterTable
ALTER TABLE "Instance" ADD COLUMN     "noContextCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "paymentCount" INTEGER NOT NULL DEFAULT 0;
