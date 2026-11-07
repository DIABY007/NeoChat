-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentName" TEXT,
ADD COLUMN     "paymentOtherMethod" TEXT,
ADD COLUMN     "paymentPhone" TEXT;

-- CreateTable
CREATE TABLE "AffiliatePayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentDetails" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliatePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AffiliatePayment_userId_idx" ON "AffiliatePayment"("userId");

-- CreateIndex
CREATE INDEX "AffiliatePayment_status_idx" ON "AffiliatePayment"("status");

-- CreateIndex
CREATE INDEX "AffiliatePayment_createdAt_idx" ON "AffiliatePayment"("createdAt");

-- AddForeignKey
ALTER TABLE "AffiliatePayment" ADD CONSTRAINT "AffiliatePayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
