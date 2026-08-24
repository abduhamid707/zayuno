#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { ProviderCapability } from '@zayuno/contracts';
import { ProviderCertificationRunner, RemoteHttpProviderAdapter } from '@zayuno/provider-sdk';

const argv = process.argv.slice(2);
const command = argv[0] || 'help';
const value = (flag: string) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined; };
const has = (flag: string) => argv.includes(flag);

function help() {
  console.log(`Zayuno Provider CLI

  zy init [directory] --template express|fastapi|go
  zy doctor --url https://api.example.uz/zayuno [--api-key key]
  zy test --url https://api.example.uz/zayuno [--api-key key] [--readonly]
  zy test --local [--port 3000] [--api-key key]
  zy dev --port 3000

No deploy command is provided: hosting remains owned by the provider.`);
}

function baseUrl() {
  if (has('--local')) return `http://127.0.0.1:${value('--port') || '3000'}`;
  const url = value('--url');
  if (!url) throw new Error('Missing --url. For a local server use --local --port 3000.');
  return url;
}

async function doctor() {
  const url = baseUrl().replace(/\/$/, '');
  const headers: Record<string, string> = {};
  if (value('--api-key')) headers['x-provider-api-key'] = value('--api-key')!;
  let failed = false;
  for (const endpoint of ['/health', '/provider-info']) {
    try {
      const started = Date.now();
      const response = await fetch(`${url}${endpoint}`, { headers, signal: AbortSignal.timeout(5000) });
      console.log(`${response.ok ? 'PASS' : 'FAIL'} ${endpoint} HTTP ${response.status} ${Date.now() - started}ms`);
      if (!response.ok) failed = true;
    } catch (error) {
      failed = true;
      console.log(`FAIL ${endpoint} ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failed) process.exitCode = 1;
}

async function test() {
  const readonly = has('--readonly');
  const capabilities = readonly
    ? [ProviderCapability.METADATA, ProviderCapability.HEALTH, ProviderCapability.CATALOG]
    : [ProviderCapability.METADATA, ProviderCapability.HEALTH, ProviderCapability.CATALOG, ProviderCapability.QUOTE, ProviderCapability.ACTION_CREATE, ProviderCapability.ACTION_STATUS, ProviderCapability.WEBHOOK];
  const adapter = new RemoteHttpProviderAdapter({
    slug: value('--slug') || 'my-provider', baseUrl: baseUrl(), secret: value('--api-key'),
    authMethod: value('--api-key') ? 'API_KEY' : 'NONE', metadata: { capabilities }
  });
  const report = await new ProviderCertificationRunner(adapter).runAllTests();
  for (const item of report.tests) {
    console.log(`${item.status.padEnd(7)} ${item.endpoint || ''} ${item.name}`);
    if (item.issue) console.log(`         ${item.issue.path || ''} ${item.issue.rootCause}${item.issue.expected ? `; expected ${item.issue.expected}` : ''}`);
  }
  console.log(`\n${report.passedCount} passed, ${report.failedCount} failed, ${report.skippedCount} blocked`);
  if (!report.isProductionReady) process.exitCode = 1;
}

async function init() {
  const template = value('--template') || 'express';
  if (!['express', 'fastapi', 'go'].includes(template)) throw new Error('Template must be express, fastapi, or go.');
  const destination = path.resolve(argv[1] && !argv[1].startsWith('--') ? argv[1] : `zayuno-${template}-provider`);
  const source = path.resolve(__dirname, '..', 'templates', template);
  await mkdir(destination, { recursive: true });
  await cp(source, destination, { recursive: true, errorOnExist: false });
  console.log(`Created ${template} starter at ${destination}`);
}

async function dev() {
  const port = value('--port') || '3000';
  console.log(`Opening an HTTPS tunnel for localhost:${port}. Keep this process running.`);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['exec', 'localtunnel', '--port', port], { stdio: 'inherit', shell: false });
    child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Tunnel exited with code ${code}`)));
  });
}

async function main() {
  if (command === 'help' || command === '--help' || command === '-h') return help();
  if (command === 'init') return init();
  if (command === 'doctor') return doctor();
  if (command === 'test') return test();
  if (command === 'dev') return dev();
  throw new Error(`Unknown command "${command}". Run zy --help.`);
}

main().catch(error => { console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
