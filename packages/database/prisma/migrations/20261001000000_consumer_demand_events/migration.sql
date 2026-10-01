CREATE TABLE "ConsumerDemandEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "messageKey" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "topic" TEXT,
  "intent" TEXT NOT NULL,
  "brands" TEXT[] NOT NULL,
  "city" TEXT,
  "budgetMax" INTEGER,
  "currency" TEXT,
  "highIntent" BOOLEAN NOT NULL,
  "outcome" TEXT NOT NULL,
  "reason" TEXT,
  "environment" TEXT NOT NULL DEFAULT 'LIVE',
  "source" TEXT NOT NULL DEFAULT 'CONSUMER_CHAT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsumerDemandEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConsumerDemandEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ConsumerDemandEvent_userId_messageKey_key" ON "ConsumerDemandEvent"("userId", "messageKey");
CREATE INDEX "ConsumerDemandEvent_createdAt_category_idx" ON "ConsumerDemandEvent"("createdAt", "category");
CREATE INDEX "ConsumerDemandEvent_outcome_createdAt_idx" ON "ConsumerDemandEvent"("outcome", "createdAt");
