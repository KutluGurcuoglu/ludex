-- Normalize existing phone values before enforcing uniqueness. Turkish local
-- (0XXXXXXXXXX), country-code (90XXXXXXXXXX), and +90 formats share one value.
ALTER TABLE "User" ADD COLUMN "phoneNormalized" TEXT;

UPDATE "User"
SET "phoneNormalized" = CASE
  WHEN regexp_replace("phone", '[^0-9]', '', 'g') ~ '^90[0-9]{10}$'
    THEN regexp_replace("phone", '[^0-9]', '', 'g')
  WHEN regexp_replace("phone", '[^0-9]', '', 'g') ~ '^0[0-9]{10}$'
    THEN '90' || substring(regexp_replace("phone", '[^0-9]', '', 'g') from 2)
  WHEN regexp_replace("phone", '[^0-9]', '', 'g') ~ '^5[0-9]{9}$'
    THEN '90' || regexp_replace("phone", '[^0-9]', '', 'g')
  ELSE regexp_replace("phone", '[^0-9]', '', 'g')
END;

ALTER TABLE "User" ALTER COLUMN "phoneNormalized" SET NOT NULL;
CREATE UNIQUE INDEX "User_phoneNormalized_key" ON "User"("phoneNormalized");
