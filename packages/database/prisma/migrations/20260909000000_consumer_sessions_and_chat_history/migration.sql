CREATE TABLE "ConsumerSession" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedBy" TEXT,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConsumerSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConsumerChatSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConsumerChatSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConsumerChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "latencyMs" INTEGER,
    "interaction" JSONB,
    "selections" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConsumerChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConsumerSession_userId_revokedAt_idx" ON "ConsumerSession"("userId", "revokedAt");
CREATE INDEX "ConsumerSession_familyId_revokedAt_idx" ON "ConsumerSession"("familyId", "revokedAt");
CREATE INDEX "ConsumerSession_expiresAt_idx" ON "ConsumerSession"("expiresAt");
CREATE INDEX "ConsumerChatSession_userId_updatedAt_idx" ON "ConsumerChatSession"("userId", "updatedAt");
CREATE INDEX "ConsumerChatMessage_sessionId_createdAt_idx" ON "ConsumerChatMessage"("sessionId", "createdAt");

ALTER TABLE "ConsumerSession" ADD CONSTRAINT "ConsumerSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsumerChatSession" ADD CONSTRAINT "ConsumerChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsumerChatMessage" ADD CONSTRAINT "ConsumerChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ConsumerChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
