/*
  Warnings:

  - The values [ACTIVE,BIG_FISH] on the enum `Status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Status_new" AS ENUM ('TRIAL', 'DIFFUSION', 'ASSISTANT', 'PREMIUM', 'EXPIRED');
ALTER TABLE "Subscription" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Subscription" ALTER COLUMN "status" TYPE "Status_new" USING ("status"::text::"Status_new");
ALTER TYPE "Status" RENAME TO "Status_old";
ALTER TYPE "Status_new" RENAME TO "Status";
DROP TYPE "Status_old";
ALTER TABLE "Subscription" ALTER COLUMN "status" SET DEFAULT 'TRIAL';
COMMIT;
