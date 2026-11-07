-- Migration: Merge ADMIN and SECRETARY into COORDINATEUR
-- 1. Create a new enum type with the new values
-- 2. Alter the column to use the new enum
-- 3. Drop the old enum

-- Step 1: Create new enum type
CREATE TYPE "AdminRole_new" AS ENUM ('SUPER_ADMIN', 'COORDINATEUR');

-- Step 2: Drop default and alter column type
ALTER TABLE "admin_users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "admin_users" ALTER COLUMN "role" TYPE "AdminRole_new" USING ("role"::text::"AdminRole_new");

-- Step 3: Set new default
ALTER TABLE "admin_users" ALTER COLUMN "role" SET DEFAULT 'COORDINATEUR'::"AdminRole_new";

-- Step 4: Drop the old enum
DROP TYPE "AdminRole";

-- Step 5: Rename new enum to old name
ALTER TYPE "AdminRole_new" RENAME TO "AdminRole";