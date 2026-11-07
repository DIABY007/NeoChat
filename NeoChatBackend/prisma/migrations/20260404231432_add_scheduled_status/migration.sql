-- CreateEnum
CREATE TYPE "StatusType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "ScheduledStatusState" AS ENUM ('PENDING', 'POSTED', 'FAILED');

-- CreateTable
CREATE TABLE "ScheduledStatus" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "StatusType" NOT NULL,
    "content" TEXT NOT NULL,
    "localFilePath" TEXT,
    "caption" TEXT,
    "backgroundColor" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "ScheduledStatusState" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduledStatus_userId_idx" ON "ScheduledStatus"("userId");

-- CreateIndex
CREATE INDEX "ScheduledStatus_status_idx" ON "ScheduledStatus"("status");

-- CreateIndex
CREATE INDEX "ScheduledStatus_scheduledAt_idx" ON "ScheduledStatus"("scheduledAt");

-- AddForeignKey
ALTER TABLE "ScheduledStatus" ADD CONSTRAINT "ScheduledStatus_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledStatus" ADD CONSTRAINT "ScheduledStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
