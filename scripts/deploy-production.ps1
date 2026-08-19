# ==============================================================================
# Zayuno Emergency Fallback / Manual Recovery Deployment Script
# Use this script ONLY when GitHub Actions is unavailable or for offline recovery.
# Standard deployments are executed via GitHub Actions (.github/workflows/deploy-production.yml).
# ==============================================================================

$ErrorActionPreference = 'Stop'

$serverHostName = '158.220.100.58'
$serverUserName = 'root'
$serverTarget = "${serverUserName}@${serverHostName}"
$remoteDirectory = '/root/zayuno'
$releaseStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$archiveName = "zayuno-release-${releaseStamp}.tar.gz"

function Assert-LastCommand([string]$message) {
  if ($LASTEXITCODE -ne 0) { throw $message }
}

Write-Host 'Running scoped local builds...'
pnpm --filter @zayuno/mock-evos --filter @zayuno/mock-coffee-time --filter @zayuno/mock-poyez --filter @zayuno/api --filter @zayuno/mcp --filter @zayuno/admin --filter @zayuno/provider-portal run build
Assert-LastCommand 'Local build failed. Production was not changed.'

Write-Host 'Verifying SSH and protected production environment...'
ssh -o BatchMode=yes $serverTarget "test -d $remoteDirectory && test -f $remoteDirectory/.env && echo READY"
Assert-LastCommand 'Production directory or protected .env file is missing.'
ssh $serverTarget "grep -Eq '^POYEZ_SANDBOX_SHARED_SECRET=.{16,}$' $remoteDirectory/.env && test -f /etc/letsencrypt/live/poyez-sandbox.shopla.uz/fullchain.pem && test -f /etc/letsencrypt/live/poyez-sandbox.shopla.uz/privkey.pem"
Assert-LastCommand 'Poyez production secret or TLS certificate is missing. Bootstrap the domain before deploying.'

Write-Host 'Creating local release archive...'
tar --exclude='node_modules' --exclude='.turbo' --exclude='dist' --exclude='.git' --exclude='work' --exclude='*.log' --exclude='*.tar.gz' -czf $archiveName apps packages integrations infra deploy scripts docker-compose.prod.yml package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json README.md
Assert-LastCommand 'Release archive creation failed.'

try {
  Write-Host 'Creating recoverable production source and Nginx backups...'
  ssh $serverTarget "mkdir -p /root/zayuno-backups/$releaseStamp && tar -czf /root/zayuno-backups/$releaseStamp/source.tar.gz -C /root zayuno && cp /etc/nginx/sites-available/zayuno.conf /root/zayuno-backups/$releaseStamp/nginx-zayuno.conf"
  Assert-LastCommand 'Production backup failed; deployment stopped.'

  Write-Host 'Uploading and validating release...'
  scp $archiveName "${serverTarget}:${remoteDirectory}/${archiveName}"
  Assert-LastCommand 'Release upload failed.'
  ssh $serverTarget "cd $remoteDirectory && tar -xzf $archiveName && rm -f $archiveName && docker compose -f docker-compose.prod.yml config --quiet"
  Assert-LastCommand 'Remote release validation failed.'

  Write-Host 'Building and restarting only affected services...'
  ssh $serverTarget "cd $remoteDirectory && docker compose -f docker-compose.prod.yml build mock-evos mock-coffee-time mock-poyez api mcp admin provider-portal && docker compose -f docker-compose.prod.yml up -d --no-deps mock-evos mock-coffee-time mock-poyez api mcp admin provider-portal"
  Assert-LastCommand 'Container deployment failed.'

  Write-Host 'Checking internal service health...'
  ssh $serverTarget "for attempt in 1 2 3 4 5 6; do curl -fsS http://127.0.0.1:4100/health >/dev/null && curl -fsS http://127.0.0.1:4101/health >/dev/null && curl -fsS http://127.0.0.1:4105/health >/dev/null && curl -fsS http://127.0.0.1:4106/health >/dev/null && curl -fsS http://127.0.0.1:4102/health >/dev/null && curl -fsS http://127.0.0.1:4103 >/dev/null && curl -fsS http://127.0.0.1:4104 >/dev/null && exit 0; sleep 3; done; exit 1"
  Assert-LastCommand 'A deployed service failed its internal health check.'

  Write-Host 'Installing scoped Nginx configuration...'
  ssh $serverTarget "cp $remoteDirectory/deploy/nginx-zayuno.conf /etc/nginx/sites-available/zayuno.conf && nginx -t && systemctl reload nginx"
  Assert-LastCommand 'Nginx validation or reload failed. Restore the saved Nginx file before retrying.'

  Write-Host "Deployment completed. Rollback backup: /root/zayuno-backups/$releaseStamp"
} finally {
  Remove-Item -LiteralPath $archiveName -Force -ErrorAction SilentlyContinue
}

# This script intentionally does not run Prisma db push, migrations, seed scripts,
# schema resets, or data-loss flags. Provider registration is a separate explicit step.
