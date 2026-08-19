# Zayuno Production Deployment & CI/CD Architecture

This guide describes the GitHub Actions + GitHub Container Registry (GHCR) deployment pipeline for Zayuno.

---

## 1. Overview & Architecture

### Previous Deployment (TAR + Remote Build)
- Built monorepo locally.
- Compressed all files into a large TAR archive.
- Uploaded via SCP (~20-100MB).
- Rebuilt all Docker containers from scratch on the production server.
- Recreated all services indiscriminately.
- **Duration**: ~12–15 minutes.

### New CI/CD Architecture (GitHub Actions + GHCR)
```mermaid
flowchart LR
    Push[Push to main / PR] --> CI[CI: Lint, Test, Contract]
    Push --> Build[Build GHCR Images: Matrix]
    Build --> GHCR[(ghcr.io/owner/zayuno/*:sha)]
    Dispatch[workflow_dispatch / Approval] --> Deploy[Deploy Workflow]
    Deploy --> Server[Production Host: 158.220.100.58]
    Server --> Pull[Pull target SHA images]
    Server --> Migrate[One-off Prisma Migrate]
    Server --> Recreate[Recreate affected containers]
    Server --> Health[Retry Backoff Health Check]
```

- **Speed**: Deployment takes **~45–90 seconds** (images are prebuilt and cached; production host only pulls layers and restarts changed containers).
- **Zero-Downtime**: Recreates containers with `--no-deps` without dropping internal databases.
- **Immutable Releases**: Every release is pinned to an exact Git commit SHA (`ghcr.io/<owner>/<repo>/<service>:<sha>`).

---

## 2. Services & Image Registry

All images are published to GitHub Container Registry (GHCR):

| Service | Dockerfile | Internal Port | External Domain | Image Tag Pattern |
|:---|:---|:---|:---|:---|
| **api** | `infra/docker/Dockerfile.api` | `4100 -> 4000` | `https://api.zayuno.uz` | `ghcr.io/<owner>/<repo>/api:<sha>` |
| **mcp** | `infra/docker/Dockerfile.mcp` | `4102 -> 4002` | `https://mcp.zayuno.uz` | `ghcr.io/<owner>/<repo>/mcp:<sha>` |
| **admin** | `infra/docker/Dockerfile.admin` | `4103 -> 3000` | `https://admin.zayuno.uz` | `ghcr.io/<owner>/<repo>/admin:<sha>` |
| **provider-portal** | `infra/docker/Dockerfile.provider-portal` | `4104 -> 3001` | `https://partners.zayuno.uz` | `ghcr.io/<owner>/<repo>/provider-portal:<sha>` |
| **worker** | `infra/docker/Dockerfile.worker` | *(Internal)* | — | `ghcr.io/<owner>/<repo>/worker:<sha>` |
| **mock-evos** | `infra/docker/Dockerfile.mock-evos` | `4101 -> 4001` | `https://evos-sandbox.shopla.uz` | `ghcr.io/<owner>/<repo>/mock-evos:<sha>` |
| **mock-coffee-time** | `infra/docker/Dockerfile.mock-coffee-time` | `4105 -> 4005` | `https://coffee-time-sandbox.shopla.uz` | `ghcr.io/<owner>/<repo>/mock-coffee-time:<sha>` |
| **mock-poyez** | `infra/docker/Dockerfile.mock-poyez` | `4106 -> 4006` | `https://poyez-sandbox.shopla.uz` | `ghcr.io/<owner>/<repo>/mock-poyez:<sha>` |

---

## 3. GitHub Secrets and Variables Setup

To enable automated production deployments, configure the following secrets and variables in GitHub Repository Settings (`Settings -> Secrets and variables -> Actions`):

### GitHub Secrets (`Environment: production` or Repository Secrets)

| Secret Name | Description | Example / Required Format |
|:---|:---|:---|
| `PROD_HOST` | Production server IP or hostname | `158.220.100.58` |
| `PROD_PORT` | SSH port (defaults to 22 if omitted) | `22` |
| `PROD_USER` | SSH username on production host | `root` |
| `PROD_SSH_KEY` | Private SSH key authorized in `/root/.ssh/authorized_keys` | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `PROD_KNOWN_HOSTS` | SSH Host Key fingerprint to prevent MITM attacks | Output of `ssh-keyscan -p 22 158.220.100.58` |

> [!IMPORTANT]
> **Strict SSH Security**: `StrictHostKeyChecking=no` is strictly disabled. The workflow always authenticates against `PROD_KNOWN_HOSTS`.

---

## 4. Initial Server Setup (One-Time Preparation)

Before running the first automated deployment from GitHub Actions:

### 1. Authenticate Docker to GHCR on the Server
SSH into the production server and log in with a GitHub Personal Access Token (PAT) having `read:packages` permission:

```bash
# On production server (158.220.100.58)
echo "<YOUR_GITHUB_PAT>" | docker login ghcr.io -u <YOUR_GITHUB_USERNAME> --password-stdin
```

### 2. Verify Poyez SSL and Shared Secrets
Verify that the Poyez sandbox TLS certificates and secrets are in place:

```bash
test -f /etc/letsencrypt/live/poyez-sandbox.shopla.uz/fullchain.pem && \
test -f /etc/letsencrypt/live/poyez-sandbox.shopla.uz/privkey.pem && \
grep -Eq '^POYEZ_SANDBOX_SHARED_SECRET=.{16,}$' /root/zayuno/.env && echo "POYEZ READY"
```

---

## 5. Deployment Procedures

### Method A: GitHub Web UI (Recommended)
1. Navigate to **Actions** in the GitHub repository.
2. Select **Deploy to Production** workflow.
3. Click **Run workflow**:
   - `deploy_sha`: (Optional) Leave empty to deploy the latest commit, or enter a specific commit SHA.
   - `services`: (Optional) `all` or specific services (e.g. `api mcp`).
   - `run_migrations`: Checked (`true`).
4. Click **Run workflow**.

### Method B: GitHub CLI (`gh`)
```bash
# Deploy latest commit on main
gh workflow run deploy-production.yml

# Deploy a specific commit SHA
gh workflow run deploy-production.yml -f deploy_sha=a1b2c3d4e5f6 -f services="api mcp"
```

### Method C: PowerShell Helper Command
```powershell
# Trigger deploy using gh CLI
gh workflow run deploy-production.yml -f deploy_sha=(git rev-parse HEAD)
```

---

## 6. Database Migrations

Zayuno uses Prisma for database management:

1. **One-Off Execution**: Migrations are executed once prior to container restarts via:
   ```bash
   pnpm db:migrate:deploy
   ```
2. **Failure Isolation**: If a database migration fails, the deployment aborts immediately. Running application containers are not restarted.
3. **Backward-Compatible Schema Rules**:
   - Always make database changes backward-compatible (expand before contract).
   - Add new nullable columns or default values before using them in code.
   - Never run destructive migrations (dropping active columns or tables) in an automated release.
4. **Seed Isolation**: Production deployments never run database seeders automatically.

---

## 7. Health Checks & Smoke Testing

The deployment script executes `deploy/health-check.sh` with bounded exponential backoff:
- **Initial grace delay**: 3 seconds.
- **Max retry attempts**: 20 attempts.
- **Backoff interval**: 2s stepping up to 8s.
- **Timeouts**: `--connect-timeout 5` and `--max-time 10`.

### Monitored Endpoints:
- **Internal**:
  - `api`: `http://127.0.0.1:4100/health`
  - `mock-evos`: `http://127.0.0.1:4101/health`
  - `mcp`: `http://127.0.0.1:4102/health`
  - `admin`: `http://127.0.0.1:4103`
  - `provider-portal`: `http://127.0.0.1:4104`
  - `mock-coffee-time`: `http://127.0.0.1:4105/health`
  - `mock-poyez`: `http://127.0.0.1:4106/health`
- **Public**:
  - `https://api.zayuno.uz/health`
  - `https://mcp.zayuno.uz/health`
  - `https://admin.zayuno.uz`
  - `https://partners.zayuno.uz`
  - `https://evos-sandbox.shopla.uz/health`
  - `https://coffee-time-sandbox.shopla.uz/health`
  - `https://poyez-sandbox.shopla.uz/health`

---

## 8. Rollback Procedures

### Automatic Rollback
If the post-deployment health check fails after 20 attempts:
1. The server deployment script automatically falls back to `/root/zayuno/.previous_release_sha`.
2. It restarts containers with the previous working SHA.
3. It performs a health check to confirm system restoration.
4. The GitHub Actions workflow fails with an alert.

### Manual Rollback via GitHub Actions
1. Navigate to **Actions -> Rollback Production**.
2. Click **Run workflow**.
3. (Optional) Provide a specific `target_sha` or leave blank to restore the last working release.

---

## 9. Emergency Fallback Deployment

If GitHub Actions is unreachable or offline recovery is necessary, the legacy fallback script `scripts/deploy-production.ps1` can be executed locally:

```powershell
# From local development root (PowerShell)
.\scripts\deploy-production.ps1
```

This builds scoped packages locally, archives source code, uploads via SCP, builds containers on the server, reloads Nginx, and validates health checks.

