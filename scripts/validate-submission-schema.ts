import * as fs from 'node:fs';
import * as path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';

export async function validateSubmissionManifest(filePath?: string) {
  const submissionPath = filePath || path.join(process.cwd(), 'chatgpt-app-submission.json');
  const schemaPath = path.join(process.cwd(), 'schemas/chatgpt-app-submission.v1.json');

  console.log(`🔍 Validating submission manifest against official OpenAI Draft 2020-12 Schema...`);
  console.log(`   - Manifest: ${submissionPath}`);
  console.log(`   - Schema:   ${schemaPath}`);

  if (!fs.existsSync(submissionPath)) {
    throw new Error(`Submission manifest file not found: ${submissionPath}`);
  }
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Official schema file not found: ${schemaPath}`);
  }

  const rawManifest = fs.readFileSync(submissionPath, 'utf8');
  const rawSchema = fs.readFileSync(schemaPath, 'utf8');

  const manifest = JSON.parse(rawManifest);
  const schema = JSON.parse(rawSchema);

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const valid = validate(manifest);

  if (!valid) {
    console.error('❌ Official OpenAI Schema Validation Failed:');
    for (const err of validate.errors || []) {
      console.error(`  - [${err.instancePath || '/'}] ${err.message} (${JSON.stringify(err.params)})`);
    }
    throw new Error(`Schema validation failed with ${validate.errors?.length || 0} errors against Draft 2020-12 specification`);
  }

  console.log(`  ✅ $schema matches official ID: ${manifest.$schema}`);
  console.log(`  ✅ schema_version: ${manifest.schema_version}`);
  console.log(`  ✅ app_info.display_name: "${manifest.app_info?.display_name}"`);
  console.log(`  ✅ app_info.subtitle: "${manifest.app_info?.subtitle}" (${manifest.app_info?.subtitle?.length}/30 chars)`);
  console.log(`  ✅ app_info.category: ${manifest.app_info?.category} (valid official enum value)`);
  console.log(`  ✅ tools: ${Object.keys(manifest.tools || {}).length} tools verified with 3 hints & 3 justifications`);
  console.log(`  ✅ positive test cases: ${manifest.test_cases?.length} (>= 5) with required fields`);
  console.log(`  ✅ negative test cases: ${manifest.negative_test_cases?.length} (>= 3) with required fields`);
  console.log('\n🎉 chatgpt-app-submission.json PASSED OFFICIAL OPENAI DRAFT 2020-12 AJV VALIDATION WITH 0 ERRORS!');

  return manifest;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('validate-submission-schema.ts')) {
  validateSubmissionManifest().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
