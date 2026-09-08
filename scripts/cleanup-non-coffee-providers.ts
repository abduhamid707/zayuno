import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log('🚀 Starting provider cleanup...');
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@') : 'undefined'}`);

  // 1. Verify coffee-time provider exists and is protected
  const coffeeProvider = await prisma.provider.findUnique({
    where: { slug: 'coffee-time' },
    include: {
      locations: true,
      quotes: true,
      actions: true,
    },
  });

  if (!coffeeProvider) {
    throw new Error('❌ CRITICAL ERROR: Provider with slug "coffee-time" NOT found in database! Aborting cleanup to prevent total data loss.');
  }

  console.log(`\n✅ Protected Provider Found:`);
  console.log(`   ID: ${coffeeProvider.id}`);
  console.log(`   Slug: ${coffeeProvider.slug}`);
  console.log(`   Name: ${coffeeProvider.name}`);
  console.log(`   Locations: ${coffeeProvider.locations.length}`);
  console.log(`   Quotes: ${coffeeProvider.quotes.length}`);
  console.log(`   Actions: ${coffeeProvider.actions.length}`);

  // 2. Identify all non-coffee providers
  const nonCoffeeProviders = await prisma.provider.findMany({
    where: {
      slug: { not: 'coffee-time' },
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  console.log(`\n📋 Found ${nonCoffeeProviders.length} providers to delete:`);
  for (const p of nonCoffeeProviders.slice(0, 10)) {
    console.log(`   - ${p.slug} (${p.name})`);
  }
  if (nonCoffeeProviders.length > 10) {
    console.log(`   ... and ${nonCoffeeProviders.length - 10} more`);
  }

  if (nonCoffeeProviders.length === 0) {
    console.log('\n✨ No non-coffee providers found to delete. Database is already clean!');
    return;
  }

  const targetProviderIds = nonCoffeeProviders.map((p) => p.id);

  // 3. Find actions and dependent records
  const targetActions = await prisma.action.findMany({
    where: {
      providerId: { in: targetProviderIds },
    },
    select: { id: true },
  });
  const targetActionIds = targetActions.map((a) => a.id);

  const targetUsers = await prisma.user.findMany({
    where: {
      providerId: { in: targetProviderIds },
    },
    select: { id: true, email: true, role: true },
  });
  const targetUserIds = targetUsers.map((u) => u.id);

  console.log(`\n📊 Dependent records to delete:`);
  console.log(`   - Actions: ${targetActionIds.length}`);
  console.log(`   - Provider Users: ${targetUserIds.length}`);

  // 4. Run transactional cleanup
  const results = await prisma.$transaction(async (tx) => {
    // a. ActionEvent
    const deletedActionEvents = await tx.actionEvent.deleteMany({
      where: {
        actionId: { in: targetActionIds },
      },
    });

    // b. Action
    const deletedActions = await tx.action.deleteMany({
      where: {
        providerId: { in: targetProviderIds },
      },
    });

    // c. Quote
    const deletedQuotes = await tx.quote.deleteMany({
      where: {
        providerId: { in: targetProviderIds },
      },
    });

    // d. Location
    const deletedLocations = await tx.location.deleteMany({
      where: {
        providerId: { in: targetProviderIds },
      },
    });

    // e. WebhookLog
    const deletedWebhookLogs = await tx.webhookLog.deleteMany({
      where: {
        providerId: { in: targetProviderIds },
      },
    });

    // f. IntegrationLog
    const deletedIntegrationLogs = await tx.integrationLog.deleteMany({
      where: {
        providerId: { in: targetProviderIds },
      },
    });

    // g. ApiKey (provider-level)
    const deletedProviderApiKeys = await tx.apiKey.deleteMany({
      where: {
        providerId: { in: targetProviderIds },
      },
    });

    // h. ApiKey (user-level for deleted provider owner accounts)
    const deletedUserApiKeys = await tx.apiKey.deleteMany({
      where: {
        userId: { in: targetUserIds },
      },
    });

    // i. Delete provider owner users (only those created for these providers)
    const deletedUsers = await tx.user.deleteMany({
      where: {
        id: { in: targetUserIds },
        role: { in: ['PROVIDER_OWNER', 'PROVIDER_DEVELOPER', 'PROVIDER_ANALYST'] },
      },
    });

    // Unlink any remaining users just in case
    await tx.user.updateMany({
      where: {
        providerId: { in: targetProviderIds },
      },
      data: {
        providerId: null,
      },
    });

    // j. Delete Providers
    const deletedProviders = await tx.provider.deleteMany({
      where: {
        id: { in: targetProviderIds },
      },
    });

    return {
      deletedActionEvents: deletedActionEvents.count,
      deletedActions: deletedActions.count,
      deletedQuotes: deletedQuotes.count,
      deletedLocations: deletedLocations.count,
      deletedWebhookLogs: deletedWebhookLogs.count,
      deletedIntegrationLogs: deletedIntegrationLogs.count,
      deletedProviderApiKeys: deletedProviderApiKeys.count,
      deletedUserApiKeys: deletedUserApiKeys.count,
      deletedUsers: deletedUsers.count,
      deletedProviders: deletedProviders.count,
    };
  }, {
    timeout: 30000,
  });

  console.log(`\n🎉 Cleanup Transaction Completed:`);
  console.log(`   - Deleted Providers: ${results.deletedProviders}`);
  console.log(`   - Deleted Locations: ${results.deletedLocations}`);
  console.log(`   - Deleted Actions: ${results.deletedActions}`);
  console.log(`   - Deleted ActionEvents: ${results.deletedActionEvents}`);
  console.log(`   - Deleted Quotes: ${results.deletedQuotes}`);
  console.log(`   - Deleted WebhookLogs: ${results.deletedWebhookLogs}`);
  console.log(`   - Deleted IntegrationLogs: ${results.deletedIntegrationLogs}`);
  console.log(`   - Deleted ApiKeys: ${results.deletedProviderApiKeys + results.deletedUserApiKeys}`);
  console.log(`   - Deleted Provider Users: ${results.deletedUsers}`);

  // 5. Verification
  const remainingProviders = await prisma.provider.findMany({
    select: { id: true, slug: true, name: true, status: true },
  });

  console.log(`\n🔍 Post-cleanup Verification:`);
  console.log(`   Total Remaining Providers: ${remainingProviders.length}`);
  for (const p of remainingProviders) {
    console.log(`   - ${p.slug} (${p.name}, status: ${p.status})`);
  }

  if (remainingProviders.length !== 1 || remainingProviders[0].slug !== 'coffee-time') {
    throw new Error('❌ Post-cleanup verification failed: Expected exactly 1 provider ("coffee-time") to remain.');
  }

  console.log('\n✅ Verification PASSED: Only "coffee-time" remains intact in the database.');
}

main()
  .catch((err) => {
    console.error('\n❌ Cleanup Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
