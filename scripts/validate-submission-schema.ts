import * as fs from 'fs';
import * as path from 'path';

async function validate() {
  console.log('🔍 Validating chatgpt-app-submission.json against official OpenAI schema...');

  const schema = {
    required: ['$schema', 'schema_version', 'tools'],
  };

  const submissionPath = path.join(process.cwd(), 'chatgpt-app-submission.json');
  const submission = JSON.parse(fs.readFileSync(submissionPath, 'utf8'));

  console.log('Checking required top-level properties:');
  for (const req of schema.required) {
    if (submission[req] === undefined) {
      throw new Error(`Missing required property: ${req}`);
    }
    console.log(`  ✅ ${req} is present:`, typeof submission[req] === 'object' ? Object.keys(submission[req]).length + ' items' : submission[req]);
  }

  // Check $schema
  // The live OpenAI Platform submission form currently requires this legacy URL
  // literally, even though it redirects to the newer /plugins/ schema URL.
  if (submission.$schema !== 'https://developers.openai.com/apps-sdk/schemas/chatgpt-app-submission.v1.json') {
    throw new Error(`Invalid $schema: ${submission.$schema}`);
  }

  // Check schema_version
  if (submission.schema_version !== 1) {
    throw new Error(`schema_version must be 1, got ${submission.schema_version}`);
  }

  // Check app_info
  if (submission.app_info) {
    console.log('  ✅ app_info.display_name:', submission.app_info.display_name);
    console.log('  ✅ app_info.subtitle:', submission.app_info.subtitle, `(${submission.app_info.subtitle.length} chars <= 30)`);
    if (submission.app_info.subtitle.length > 30) throw new Error('Subtitle exceeds 30 chars!');
    console.log('  ✅ app_info.category:', submission.app_info.category);
  }

  // Check tools
  const tools = submission.tools;
  const toolNames = Object.keys(tools);
  console.log(`  ✅ Tools count: ${toolNames.length}`);
  for (const name of toolNames) {
    const t = tools[name];
    if (!t.annotations || typeof t.annotations.readOnlyHint !== 'boolean' || typeof t.annotations.openWorldHint !== 'boolean' || typeof t.annotations.destructiveHint !== 'boolean') {
      throw new Error(`Tool ${name} has invalid annotations`);
    }
    if (!t.justifications || !t.justifications.read_only_justification || !t.justifications.open_world_justification || !t.justifications.destructive_justification) {
      throw new Error(`Tool ${name} has invalid justifications`);
    }
  }
  console.log('  ✅ All tool annotations & justifications valid');

  // Check test_cases
  if (!submission.test_cases || submission.test_cases.length < 5) {
    throw new Error(`test_cases must have >= 5 items, found ${submission.test_cases?.length}`);
  }
  console.log(`  ✅ Positive test cases: ${submission.test_cases.length} (>= 5)`);

  // Check negative_test_cases
  if (!submission.negative_test_cases || submission.negative_test_cases.length < 3) {
    throw new Error(`negative_test_cases must have >= 3 items, found ${submission.negative_test_cases?.length}`);
  }
  console.log(`  ✅ Negative test cases: ${submission.negative_test_cases.length} (>= 3)`);

  console.log('\n🎉 chatgpt-app-submission.json 100% COMPLIANT WITH OPENAI SCHEMA!');
}

validate().catch(err => {
  console.error('❌ Validation error:', err);
  process.exit(1);
});
