-- CreateTable
CREATE TABLE "BotGroup" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "whatsappGroupId" TEXT NOT NULL,
    "groupName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BotGroup_instanceId_idx" ON "BotGroup"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "BotGroup_instanceId_whatsappGroupId_key" ON "BotGroup"("instanceId", "whatsappGroupId");

-- AddForeignKey
ALTER TABLE "BotGroup" ADD CONSTRAINT "BotGroup_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
