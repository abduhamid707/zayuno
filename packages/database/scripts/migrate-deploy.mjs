import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const INIT_MIGRATION = '20260816000000_init';
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const packageDirectory = dirname(scriptDirectory);
const require = createRequire(import.meta.url);

loadEnv({ path: join(packageDirectory, '.env') });

/**
 * This is the only pre-ledger schema which can be baselined automatically.
 * It is intentionally exact: a database with even one unexpected table,
 * column, enum, constraint, or index must be reviewed by an operator.
 */
export const LEGACY_CORE_SIGNATURE = Object.freeze({
  tables: [
    'ApiKey', 'Branch', 'IntegrationLog', 'Order', 'OrderEvent',
    'OrderQuote', 'Provider', 'User', 'WebhookLog'
  ],
  columns: [
    'ApiKey.id:text:NO', 'ApiKey.name:text:NO', 'ApiKey.keyHash:text:NO',
    'ApiKey.keyPrefix:text:NO', 'ApiKey.role:UserRole:NO', 'ApiKey.userId:text:YES',
    'ApiKey.providerId:text:YES', 'ApiKey.expiresAt:timestamp:YES',
    'ApiKey.lastUsedAt:timestamp:YES', 'ApiKey.isActive:bool:NO', 'ApiKey.createdAt:timestamp:NO',
    'Branch.id:text:NO', 'Branch.providerId:text:NO', 'Branch.providerBranchId:text:NO',
    'Branch.name:text:NO', 'Branch.address:text:NO', 'Branch.latitude:float8:NO',
    'Branch.longitude:float8:NO', 'Branch.workingHours:jsonb:NO',
    'Branch.deliveryRadiusKm:float8:NO', 'Branch.isActive:bool:NO',
    'Branch.metadata:jsonb:NO', 'Branch.createdAt:timestamp:NO', 'Branch.updatedAt:timestamp:NO',
    'IntegrationLog.id:text:NO', 'IntegrationLog.providerId:text:NO',
    'IntegrationLog.traceId:text:NO', 'IntegrationLog.endpoint:text:NO',
    'IntegrationLog.method:text:NO', 'IntegrationLog.requestBody:jsonb:YES',
    'IntegrationLog.responseBody:jsonb:YES', 'IntegrationLog.statusCode:int4:NO',
    'IntegrationLog.durationMs:int4:NO', 'IntegrationLog.errorMessage:text:YES',
    'IntegrationLog.createdAt:timestamp:NO',
    'Order.id:text:NO', 'Order.publicId:text:NO', 'Order.userId:text:YES',
    'Order.providerId:text:NO', 'Order.branchId:text:YES', 'Order.quoteId:text:YES',
    'Order.status:OrderStatus:NO', 'Order.items:jsonb:NO', 'Order.subtotal:numeric:NO',
    'Order.deliveryFee:numeric:NO', 'Order.discount:numeric:NO', 'Order.total:numeric:NO',
    'Order.currency:text:NO', 'Order.deliveryType:DeliveryType:NO',
    'Order.customerName:text:NO', 'Order.customerPhone:text:NO',
    'Order.deliveryAddress:text:YES', 'Order.latitude:float8:YES', 'Order.longitude:float8:YES',
    'Order.providerOrderId:text:YES', 'Order.paymentMethod:text:YES',
    'Order.paymentStatus:PaymentStatus:NO', 'Order.paymentUrl:text:YES',
    'Order.idempotencyKey:text:YES', 'Order.metadata:jsonb:NO',
    'Order.createdAt:timestamp:NO', 'Order.updatedAt:timestamp:NO',
    'OrderEvent.id:text:NO', 'OrderEvent.orderId:text:NO', 'OrderEvent.status:OrderStatus:NO',
    'OrderEvent.description:text:NO', 'OrderEvent.source:text:NO',
    'OrderEvent.payload:jsonb:YES', 'OrderEvent.createdAt:timestamp:NO',
    'OrderQuote.id:text:NO', 'OrderQuote.providerId:text:NO', 'OrderQuote.branchId:text:YES',
    'OrderQuote.items:jsonb:NO', 'OrderQuote.subtotal:numeric:NO',
    'OrderQuote.deliveryFee:numeric:NO', 'OrderQuote.discount:numeric:NO',
    'OrderQuote.total:numeric:NO', 'OrderQuote.currency:text:NO',
    'OrderQuote.deliveryType:DeliveryType:NO', 'OrderQuote.address:text:YES',
    'OrderQuote.expiresAt:timestamp:NO', 'OrderQuote.createdAt:timestamp:NO',
    'Provider.id:text:NO', 'Provider.slug:text:NO', 'Provider.name:text:NO',
    'Provider.logoUrl:text:YES', 'Provider.status:ProviderStatus:NO',
    'Provider.type:ProviderType:NO', 'Provider.capabilities:_ProviderCapability:YES',
    'Provider.baseUrl:text:NO', 'Provider.encryptedSecret:text:NO',
    'Provider.webhookSecret:text:NO', 'Provider.metadata:jsonb:NO',
    'Provider.createdAt:timestamp:NO', 'Provider.updatedAt:timestamp:NO',
    'User.id:text:NO', 'User.email:text:NO', 'User.passwordHash:text:NO', 'User.name:text:NO',
    'User.role:UserRole:NO', 'User.providerId:text:YES', 'User.isActive:bool:NO',
    'User.createdAt:timestamp:NO', 'User.updatedAt:timestamp:NO',
    'WebhookLog.id:text:NO', 'WebhookLog.providerId:text:NO', 'WebhookLog.event:text:NO',
    'WebhookLog.headers:jsonb:NO', 'WebhookLog.payload:jsonb:NO',
    'WebhookLog.signature:text:YES', 'WebhookLog.isVerified:bool:NO',
    'WebhookLog.isProcessed:bool:NO', 'WebhookLog.errorMessage:text:YES',
    'WebhookLog.createdAt:timestamp:NO'
  ],
  enums: [
    'DeliveryType:DELIVERY,PICKUP',
    'OrderStatus:DRAFT,AWAITING_CONFIRMATION,CREATING,AWAITING_PAYMENT,PAID,ACCEPTED,PREPARING,READY,DELIVERING,DELIVERED,COMPLETED,CANCELLED,FAILED',
    'PaymentStatus:PENDING,AUTHORIZED,PAID,FAILED,REFUNDED',
    'ProviderCapability:MENU,SEARCH,ORDER_QUOTE,ORDER_CREATE,ORDER_CANCEL,ORDER_STATUS,PAYMENT_LINK,DELIVERY,PICKUP',
    'ProviderStatus:DRAFT,SANDBOX,ACTIVE,SUSPENDED,DISABLED',
    'ProviderType:FOOD,DELIVERY,RETAIL,SERVICES',
    'UserRole:SUPER_ADMIN,ADMIN,PROVIDER_OWNER,PROVIDER_DEVELOPER,PROVIDER_ANALYST,API_CONSUMER'
  ],
  constraints: [
    'ApiKey.ApiKey_pkey:p', 'ApiKey.ApiKey_providerId_fkey:f', 'ApiKey.ApiKey_userId_fkey:f',
    'Branch.Branch_pkey:p', 'Branch.Branch_providerId_fkey:f',
    'IntegrationLog.IntegrationLog_pkey:p', 'IntegrationLog.IntegrationLog_providerId_fkey:f',
    'Order.Order_branchId_fkey:f', 'Order.Order_pkey:p', 'Order.Order_providerId_fkey:f',
    'Order.Order_quoteId_fkey:f', 'Order.Order_userId_fkey:f',
    'OrderEvent.OrderEvent_orderId_fkey:f', 'OrderEvent.OrderEvent_pkey:p',
    'OrderQuote.OrderQuote_pkey:p', 'Provider.Provider_pkey:p',
    'User.User_pkey:p', 'User.User_providerId_fkey:f',
    'WebhookLog.WebhookLog_pkey:p', 'WebhookLog.WebhookLog_providerId_fkey:f'
  ],
  indexes: [
    'ApiKey.ApiKey_keyHash_key', 'ApiKey.ApiKey_pkey',
    'Branch.Branch_pkey', 'Branch.Branch_providerId_providerBranchId_key',
    'IntegrationLog.IntegrationLog_pkey', 'IntegrationLog.IntegrationLog_providerId_createdAt_idx',
    'IntegrationLog.IntegrationLog_traceId_idx',
    'Order.Order_createdAt_idx', 'Order.Order_idempotencyKey_key', 'Order.Order_pkey',
    'Order.Order_providerId_status_idx', 'Order.Order_publicId_key',
    'OrderEvent.OrderEvent_orderId_createdAt_idx', 'OrderEvent.OrderEvent_pkey',
    'OrderQuote.OrderQuote_pkey', 'Provider.Provider_pkey', 'Provider.Provider_slug_key',
    'User.User_email_key', 'User.User_pkey', 'WebhookLog.WebhookLog_pkey',
    'WebhookLog.WebhookLog_providerId_createdAt_idx'
  ]
});

function sorted(values) {
  return [...values].sort();
}

function difference(label, expected, actual) {
  const expectedValue = sorted(expected).join('|');
  const actualValue = sorted(actual).join('|');
  return expectedValue === actualValue ? null : `${label} do not match the verified legacy init signature`;
}

/**
 * Pure guard used by the runner and focused regression test. It returns a
 * decision instead of running any migration, so an unknown database can never
 * be baselined as a side effect of inspection.
 */
export function classifyMigrationState(signature) {
  if (signature.migrationTableExists) return { kind: 'DEPLOY' };

  if (signature.tables.length === 0 && signature.customTypes.length === 0) {
    return { kind: 'DEPLOY' };
  }

  const mismatches = [
    difference('tables', LEGACY_CORE_SIGNATURE.tables, signature.tables),
    difference('columns', LEGACY_CORE_SIGNATURE.columns, signature.columns),
    difference('enum types', LEGACY_CORE_SIGNATURE.enums, signature.enums),
    difference('constraints', LEGACY_CORE_SIGNATURE.constraints, signature.constraints),
    difference('indexes', LEGACY_CORE_SIGNATURE.indexes, signature.indexes)
  ].filter(Boolean);

  if (mismatches.length === 0) return { kind: 'BASELINE_INIT' };
  return { kind: 'REJECT', reason: mismatches.join('; ') };
}

function postgresTextArray(values) {
  const literals = sorted(values).map((value) => `'${value.replaceAll("'", "''")}'`);
  return `ARRAY[${literals.join(', ')}]::text[]`;
}

/**
 * Uses the Prisma CLI instead of Prisma Client so the guard also works after
 * `prisma generate --no-engine` in a release image.
 */
export function buildLegacyVerificationSql() {
  const expectedEnumTypes = LEGACY_CORE_SIGNATURE.enums.map((value) => value.split(':', 1)[0]);
  return `
DO $$
DECLARE
  target_schema text := current_schema();
  actual_values text[];
BEGIN
  IF to_regclass(format('%I.%I', target_schema, '_prisma_migrations')) IS NOT NULL THEN
    RAISE EXCEPTION 'ZAYUNO_LEGACY_BOOTSTRAP_REFUSED: migration ledger already exists';
  END IF;

  SELECT COALESCE(array_agg(table_name ORDER BY table_name), ARRAY[]::text[]) INTO actual_values
  FROM information_schema.tables
  WHERE table_schema = target_schema AND table_type = 'BASE TABLE';
  IF actual_values IS DISTINCT FROM ${postgresTextArray(LEGACY_CORE_SIGNATURE.tables)} THEN
    RAISE EXCEPTION 'ZAYUNO_LEGACY_BOOTSTRAP_REFUSED: table signature does not match the verified init schema';
  END IF;

  SELECT COALESCE(array_agg(type_info.typname ORDER BY type_info.typname), ARRAY[]::text[]) INTO actual_values
  FROM pg_type type_info
  JOIN pg_namespace namespace_info ON namespace_info.oid = type_info.typnamespace
  WHERE namespace_info.nspname = target_schema AND type_info.typtype IN ('e', 'd');
  IF actual_values IS DISTINCT FROM ${postgresTextArray(expectedEnumTypes)} THEN
    RAISE EXCEPTION 'ZAYUNO_LEGACY_BOOTSTRAP_REFUSED: custom type signature does not match the verified init schema';
  END IF;

  SELECT COALESCE(array_agg(format('%s.%s:%s:%s', table_name, column_name, udt_name, is_nullable) ORDER BY table_name, column_name), ARRAY[]::text[]) INTO actual_values
  FROM information_schema.columns
  WHERE table_schema = target_schema;
  IF actual_values IS DISTINCT FROM ${postgresTextArray(LEGACY_CORE_SIGNATURE.columns)} THEN
    RAISE EXCEPTION 'ZAYUNO_LEGACY_BOOTSTRAP_REFUSED: column signature does not match the verified init schema';
  END IF;

  SELECT COALESCE(array_agg(format('%s:%s', enum_signature.typname, array_to_string(enum_signature.labels, ',')) ORDER BY enum_signature.typname), ARRAY[]::text[]) INTO actual_values
  FROM (
    SELECT type_info.typname, array_agg(enum_info.enumlabel ORDER BY enum_info.enumsortorder) AS labels
    FROM pg_type type_info
    JOIN pg_namespace namespace_info ON namespace_info.oid = type_info.typnamespace
    JOIN pg_enum enum_info ON enum_info.enumtypid = type_info.oid
    WHERE namespace_info.nspname = target_schema
    GROUP BY type_info.typname
  ) AS enum_signature;
  IF actual_values IS DISTINCT FROM ${postgresTextArray(LEGACY_CORE_SIGNATURE.enums)} THEN
    RAISE EXCEPTION 'ZAYUNO_LEGACY_BOOTSTRAP_REFUSED: enum labels do not match the verified init schema';
  END IF;

  SELECT COALESCE(array_agg(format('%s.%s:%s', relation_info.relname, constraint_info.conname, constraint_info.contype) ORDER BY relation_info.relname, constraint_info.conname), ARRAY[]::text[]) INTO actual_values
  FROM pg_constraint constraint_info
  JOIN pg_class relation_info ON relation_info.oid = constraint_info.conrelid
  JOIN pg_namespace namespace_info ON namespace_info.oid = constraint_info.connamespace
  WHERE namespace_info.nspname = target_schema;
  IF actual_values IS DISTINCT FROM ${postgresTextArray(LEGACY_CORE_SIGNATURE.constraints)} THEN
    RAISE EXCEPTION 'ZAYUNO_LEGACY_BOOTSTRAP_REFUSED: constraint signature does not match the verified init schema';
  END IF;

  SELECT COALESCE(array_agg(format('%s.%s', tablename, indexname) ORDER BY tablename, indexname), ARRAY[]::text[]) INTO actual_values
  FROM pg_indexes
  WHERE schemaname = target_schema;
  IF actual_values IS DISTINCT FROM ${postgresTextArray(LEGACY_CORE_SIGNATURE.indexes)} THEN
    RAISE EXCEPTION 'ZAYUNO_LEGACY_BOOTSTRAP_REFUSED: index signature does not match the verified init schema';
  END IF;
END $$;`;
}

function invokePrisma(args, options = {}) {
  const prismaCli = require.resolve('prisma/build/index.js');
  return spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: packageDirectory,
    env: process.env,
    stdio: options.stdio ?? 'inherit',
    input: options.input,
    encoding: options.encoding
  });
}

function runPrismaCli(args, options) {
  const result = invokePrisma(args, options);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Prisma ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}.`);
}

function writeCapturedOutput(result) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required before running database migrations.');
  }

  const normalDeploy = invokePrisma(['migrate', 'deploy'], { stdio: 'pipe', encoding: 'utf8' });
  if (normalDeploy.error) throw normalDeploy.error;
  if (normalDeploy.status === 0) {
    writeCapturedOutput(normalDeploy);
    return;
  }

  const guard = invokePrisma(['db', 'execute', '--stdin', '--schema', 'prisma/schema.prisma'], {
    stdio: 'pipe',
    input: buildLegacyVerificationSql(),
    encoding: 'utf8'
  });
  if (guard.error || guard.status !== 0) {
    writeCapturedOutput(normalDeploy);
    writeCapturedOutput(guard);
    throw new Error(
      `Refusing to baseline ${INIT_MIGRATION}: normal Prisma deployment failed and the target is not the exact verified legacy init schema. ` +
      'No migration was marked as applied. Inspect the database and establish its migration history manually before retrying.'
    );
  }

  console.log(`Verified legacy init schema. Marking only ${INIT_MIGRATION} as applied before normal deployment.`);
  runPrismaCli(['migrate', 'resolve', '--applied', INIT_MIGRATION]);
  runPrismaCli(['migrate', 'deploy']);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
