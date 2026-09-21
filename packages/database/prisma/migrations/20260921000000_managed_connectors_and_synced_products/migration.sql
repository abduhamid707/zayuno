-- CreateEnum
CREATE TYPE "ConnectorInstanceStatus" AS ENUM ('CONNECTED', 'SYNCING', 'PAUSED', 'ERROR', 'DISCONNECTED');

-- CreateTable
CREATE TABLE "ConnectorDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "description" TEXT,
    "logoUrl" TEXT,
    "authType" TEXT NOT NULL DEFAULT 'API_KEY',
    "capabilities" "ProviderCapability"[] DEFAULT ARRAY['METADATA'::"ProviderCapability", 'CATALOG'::"ProviderCapability", 'SEARCH'::"ProviderCapability"],
    "configSchema" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectorDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectorCredential" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "connectorDefinitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default Credential',
    "encryptedSecret" TEXT NOT NULL,
    "maskedSecret" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectorCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectorInstance" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "connectorDefinitionId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Primary Connection',
    "status" "ConnectorInstanceStatus" NOT NULL DEFAULT 'CONNECTED',
    "selectedShopId" TEXT,
    "selectedShopName" TEXT,
    "autoSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "syncIntervalHours" INTEGER NOT NULL DEFAULT 8,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncError" TEXT,
    "nextSyncAt" TIMESTAMP(3),
    "syncLockUntil" TIMESTAMP(3),
    "syncRunId" TEXT,
    "totalProducts" INTEGER NOT NULL DEFAULT 0,
    "activeProducts" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectorInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectorSyncRun" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT 'MANUAL',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "activeCount" INTEGER NOT NULL DEFAULT 0,
    "hiddenCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "ConnectorSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncedProduct" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "externalShopId" TEXT NOT NULL,
    "externalProductId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "categorySlug" TEXT,
    "categoryTitle" TEXT,
    "imageUrl" TEXT,
    "media" JSONB NOT NULL DEFAULT '[]',
    "basePrice" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "productUrl" TEXT NOT NULL,
    "variants" JSONB NOT NULL DEFAULT '[]',
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "sourceStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenRunId" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncedProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConnectorCredential_providerId_connectorDefinitionId_idx" ON "ConnectorCredential"("providerId", "connectorDefinitionId");

-- CreateIndex
CREATE INDEX "ConnectorInstance_providerId_status_idx" ON "ConnectorInstance"("providerId", "status");

-- CreateIndex
CREATE INDEX "ConnectorInstance_connectorDefinitionId_status_idx" ON "ConnectorInstance"("connectorDefinitionId", "status");

-- CreateIndex
CREATE INDEX "ConnectorSyncRun_instanceId_startedAt_idx" ON "ConnectorSyncRun"("instanceId", "startedAt");

-- CreateIndex
CREATE INDEX "ConnectorSyncRun_providerId_startedAt_idx" ON "ConnectorSyncRun"("providerId", "startedAt");

-- CreateIndex
CREATE INDEX "SyncedProduct_providerId_isVisible_isAvailable_idx" ON "SyncedProduct"("providerId", "isVisible", "isAvailable");

-- CreateIndex
CREATE INDEX "SyncedProduct_instanceId_isVisible_idx" ON "SyncedProduct"("instanceId", "isVisible");

-- CreateIndex
CREATE INDEX "SyncedProduct_categorySlug_idx" ON "SyncedProduct"("categorySlug");

-- CreateIndex
CREATE UNIQUE INDEX "SyncedProduct_instanceId_externalShopId_externalProductId_key" ON "SyncedProduct"("instanceId", "externalShopId", "externalProductId");

-- AddForeignKey
ALTER TABLE "ConnectorCredential" ADD CONSTRAINT "ConnectorCredential_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectorCredential" ADD CONSTRAINT "ConnectorCredential_connectorDefinitionId_fkey" FOREIGN KEY ("connectorDefinitionId") REFERENCES "ConnectorDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectorInstance" ADD CONSTRAINT "ConnectorInstance_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectorInstance" ADD CONSTRAINT "ConnectorInstance_connectorDefinitionId_fkey" FOREIGN KEY ("connectorDefinitionId") REFERENCES "ConnectorDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectorInstance" ADD CONSTRAINT "ConnectorInstance_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "ConnectorCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectorSyncRun" ADD CONSTRAINT "ConnectorSyncRun_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "ConnectorInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncedProduct" ADD CONSTRAINT "SyncedProduct_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncedProduct" ADD CONSTRAINT "SyncedProduct_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "ConnectorInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
