/*
  Warnings:

  - The values [QR_READY] on the enum `InstanceStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "InstanceStatus_new" AS ENUM ('DISCONNECTED', 'CONNECTING', 'CONNECTED');
ALTER TABLE "Instance" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Instance" ALTER COLUMN "status" TYPE "InstanceStatus_new" USING ("status"::text::"InstanceStatus_new");
ALTER TYPE "InstanceStatus" RENAME TO "InstanceStatus_old";
ALTER TYPE "InstanceStatus_new" RENAME TO "InstanceStatus";
DROP TYPE "InstanceStatus_old";
ALTER TABLE "Instance" ALTER COLUMN "status" SET DEFAULT 'DISCONNECTED';
COMMIT;
