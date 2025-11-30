/*
  Warnings:

  - You are about to drop the column `userId` on the `conversation` table. All the data in the column will be lost.
  - You are about to drop the column `meta` on the `message` table. All the data in the column will be lost.
  - You are about to alter the column `content` on the `message` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Json`.
  - A unique constraint covering the columns `[lowConversationId]` on the table `Conversation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `conversation` DROP COLUMN `userId`,
    ADD COLUMN `lowConversationId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `message` DROP COLUMN `meta`,
    MODIFY `content` JSON NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Conversation_lowConversationId_key` ON `Conversation`(`lowConversationId`);

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_lowConversationId_fkey` FOREIGN KEY (`lowConversationId`) REFERENCES `Conversation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
