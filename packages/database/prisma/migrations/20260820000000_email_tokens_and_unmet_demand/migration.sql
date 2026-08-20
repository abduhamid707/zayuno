-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "resendCount" INTEGER NOT NULL DEFAULT 1,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnmetDemandRecord" (
    "id" TEXT NOT NULL,
    "bucketKey" TEXT NOT NULL,
    "category" TEXT,
    "geography" TEXT,
    "requestedCapability" TEXT,
    "queryIntent" TEXT,
    "reasonCode" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'SEARCH',
    "count" INTEGER NOT NULL DEFAULT 1,
    "lastOccurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnmetDemandRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_email_key" ON "EmailVerificationToken"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_email_idx" ON "EmailVerificationToken"("email");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_tokenHash_idx" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "UnmetDemandRecord_bucketKey_key" ON "UnmetDemandRecord"("bucketKey");

-- CreateIndex
CREATE INDEX "UnmetDemandRecord_category_idx" ON "UnmetDemandRecord"("category");

-- CreateIndex
CREATE INDEX "UnmetDemandRecord_geography_idx" ON "UnmetDemandRecord"("geography");

-- CreateIndex
CREATE INDEX "UnmetDemandRecord_reasonCode_idx" ON "UnmetDemandRecord"("reasonCode");

-- CreateIndex
CREATE INDEX "UnmetDemandRecord_createdAt_idx" ON "UnmetDemandRecord"("createdAt");
