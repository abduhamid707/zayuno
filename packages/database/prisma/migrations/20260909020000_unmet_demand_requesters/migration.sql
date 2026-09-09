CREATE TABLE "UnmetDemandRequester" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "intentKey" TEXT NOT NULL,
    "queryIntent" TEXT,
    "category" TEXT,
    "geography" TEXT,
    "requestedCapability" TEXT,
    "reasonCode" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'CONSUMER_CHAT',
    "requestCount" INTEGER NOT NULL DEFAULT 1,
    "notifyWhenAvailable" BOOLEAN NOT NULL DEFAULT false,
    "notificationStatus" TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
    "firstRequestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRequestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnmetDemandRequester_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UnmetDemandRequester_userId_intentKey_key"
ON "UnmetDemandRequester"("userId", "intentKey");

CREATE INDEX "UnmetDemandRequester_intentKey_lastRequestedAt_idx"
ON "UnmetDemandRequester"("intentKey", "lastRequestedAt");

CREATE INDEX "UnmetDemandRequester_category_lastRequestedAt_idx"
ON "UnmetDemandRequester"("category", "lastRequestedAt");

CREATE INDEX "UnmetDemandRequester_notifyWhenAvailable_notificationStatus_idx"
ON "UnmetDemandRequester"("notifyWhenAvailable", "notificationStatus");

ALTER TABLE "UnmetDemandRequester"
ADD CONSTRAINT "UnmetDemandRequester_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
