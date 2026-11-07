-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INCOMING', 'OUTGOING');

-- CreateTable
CREATE TABLE "MessageActivity" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "instanceName" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "senderPhone" TEXT,
    "messageText" TEXT NOT NULL,
    "responseTimeMs" INTEGER,
    "confidence" DOUBLE PRECISION,
    "wasAnswered" BOOLEAN NOT NULL DEFAULT true,
    "isGroupMessage" BOOLEAN NOT NULL DEFAULT false,
    "groupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageActivity_instanceId_idx" ON "MessageActivity"("instanceId");

-- CreateIndex
CREATE INDEX "MessageActivity_instanceName_idx" ON "MessageActivity"("instanceName");

-- CreateIndex
CREATE INDEX "MessageActivity_createdAt_idx" ON "MessageActivity"("createdAt");

-- CreateIndex
CREATE INDEX "MessageActivity_instanceName_createdAt_idx" ON "MessageActivity"("instanceName", "createdAt");

-- AddForeignKey
ALTER TABLE "MessageActivity" ADD CONSTRAINT "MessageActivity_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
