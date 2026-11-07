-- CreateEnum
CREATE TYPE "EntityStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SECRETARY');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'SECRETARY',
    "name" TEXT,
    "otp_code" TEXT,
    "otp_expiry" TIMESTAMP(3),
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content_markdown" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annonces_express" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "annonces_express_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_phone_number_key" ON "admin_users"("phone_number");

-- CreateIndex
CREATE INDEX "admin_users_phone_number_idx" ON "admin_users"("phone_number");

-- CreateIndex
CREATE INDEX "admin_users_status_idx" ON "admin_users"("status");

-- CreateIndex
CREATE INDEX "admin_users_otp_code_idx" ON "admin_users"("otp_code");

-- CreateIndex
CREATE INDEX "knowledge_documents_uploaded_by_idx" ON "knowledge_documents"("uploaded_by");

-- CreateIndex
CREATE INDEX "knowledge_documents_status_idx" ON "knowledge_documents"("status");

-- CreateIndex
CREATE INDEX "knowledge_documents_createdAt_idx" ON "knowledge_documents"("createdAt");

-- CreateIndex
CREATE INDEX "annonces_express_created_by_idx" ON "annonces_express"("created_by");

-- CreateIndex
CREATE INDEX "annonces_express_status_idx" ON "annonces_express"("status");

-- CreateIndex
CREATE INDEX "annonces_express_expires_at_idx" ON "annonces_express"("expires_at");

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annonces_express" ADD CONSTRAINT "annonces_express_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
