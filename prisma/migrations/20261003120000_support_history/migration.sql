CREATE TABLE IF NOT EXISTS "SupportConversation" (
 "id" TEXT PRIMARY KEY, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE IF NOT EXISTS "SupportMessage" (
 "id" TEXT PRIMARY KEY, "conversationId" TEXT NOT NULL,
 "role" TEXT NOT NULL, "text" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SupportMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SupportConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
ALTER TABLE "SupportConversation" ADD COLUMN "title" TEXT NOT NULL DEFAULT 'Nouvelle discussion', ADD COLUMN "userId" TEXT;
ALTER TABLE "SupportConversation" ADD CONSTRAINT "SupportConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "SupportConversation_userId_updatedAt_idx" ON "SupportConversation"("userId", "updatedAt");
