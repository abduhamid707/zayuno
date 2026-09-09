CREATE TABLE "ConsumerMemoryProfile" (
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "consentVersion" TEXT,
    "consentedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "summary" JSONB NOT NULL DEFAULT '{}',
    "analyzedUserMessageCount" INTEGER NOT NULL DEFAULT 0,
    "lastAnalyzedMessageAt" TIMESTAMP(3),
    "lastAnalyzedMessageId" TEXT,
    "lastAnalysisAt" TIMESTAMP(3),
    "analysisLeaseUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConsumerMemoryProfile_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "ConsumerMemorySignal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'AI_EXTRACTED',
    "evidenceMessageIds" TEXT[],
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConsumerMemorySignal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConsumerMemoryJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "messageCount" INTEGER NOT NULL,
    "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConsumerMemoryJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConsumerSuggestionEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "event" TEXT NOT NULL,
    "suggestionType" TEXT NOT NULL,
    "suggestionKey" TEXT NOT NULL,
    "suggestionText" TEXT NOT NULL,
    "context" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsumerSuggestionEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConsumerMemorySignal_userId_kind_key_key" ON "ConsumerMemorySignal"("userId", "kind", "key");
CREATE INDEX "ConsumerMemorySignal_userId_status_expiresAt_idx" ON "ConsumerMemorySignal"("userId", "status", "expiresAt");
CREATE INDEX "ConsumerMemorySignal_userId_lastSeenAt_idx" ON "ConsumerMemorySignal"("userId", "lastSeenAt");
CREATE INDEX "ConsumerMemoryJob_status_runAfter_idx" ON "ConsumerMemoryJob"("status", "runAfter");
CREATE INDEX "ConsumerMemoryJob_userId_status_idx" ON "ConsumerMemoryJob"("userId", "status");
CREATE INDEX "ConsumerSuggestionEvent_userId_createdAt_idx" ON "ConsumerSuggestionEvent"("userId", "createdAt");
CREATE INDEX "ConsumerSuggestionEvent_userId_suggestionKey_event_idx" ON "ConsumerSuggestionEvent"("userId", "suggestionKey", "event");

ALTER TABLE "ConsumerMemoryProfile" ADD CONSTRAINT "ConsumerMemoryProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsumerMemorySignal" ADD CONSTRAINT "ConsumerMemorySignal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsumerMemoryJob" ADD CONSTRAINT "ConsumerMemoryJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsumerSuggestionEvent" ADD CONSTRAINT "ConsumerSuggestionEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
