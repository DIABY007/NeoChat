-- CreateTable
CREATE TABLE "DashboardThemesDaily" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "themes" JSONB NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardThemesDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DashboardThemesDaily_date_idx" ON "DashboardThemesDaily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardThemesDaily_date_key" ON "DashboardThemesDaily"("date");
