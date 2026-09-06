-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "removalReason" TEXT,
ADD COLUMN     "removedAt" TIMESTAMP(3),
ADD COLUMN     "removedById" INTEGER;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "DevRequester"("id") ON DELETE SET NULL ON UPDATE CASCADE;
