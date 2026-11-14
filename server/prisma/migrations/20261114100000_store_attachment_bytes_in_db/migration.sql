-- Lab 5: store attachment content in the database instead of the container disk.
-- Additive: existing rows keep data = NULL.
ALTER TABLE "Attachment" ADD COLUMN "data" BYTEA;
