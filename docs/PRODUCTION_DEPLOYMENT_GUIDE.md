# AI Shorts Factory — Production Deployment & Operations Runbook

## 1. System Architecture Overview

AI Shorts Factory is a production-grade SaaS platform for automated YouTube Shorts creation, editing, visual packaging, and publishing. The application architecture consists of:

- **Frontend Client:** Next.js 14 (React, TypeScript, Tailwind CSS, Lucide icons) running on Node.js 20.
- **REST API Backend:** High-concurrency FastAPI (Python 3.12 / 3.13) with Pydantic validation and JWT authentication.
- **Media Engine:** Production FFmpeg & FFprobe pipeline for video probing, scene-cut detection, silence detection, 9:16 vertical reframing, and multitrack rendering.
- **Database:** SQLite with Write-Ahead Logging (WAL) and foreign keys enabled, plus automated atomic online backups via `conn.backup()`. Compatible with Supabase PostgreSQL.
- **Job Queue:** Redis message broker with Celery workers for video transcription, AI moment detection, and multi-track exports.
- **Reverse Proxy:** Nginx with HTTP/2, TLS termination, static media caching (`/media/`), and rate limiting.

---

## 2. Infrastructure Requirements & Sizing

| Workload Tier | Concurrent Users | CPU Cores | RAM | Storage | Recommended Instance |
|---|---|---|---|---|---|
| **Starter / Staging** | 10 – 50 | 4 vCPU | 8 GB | 100 GB NVMe | AWS c6i.xlarge / GCP c2-standard-4 |
| **Production Standard** | 100 – 500 | 8 vCPU | 16 GB | 500 GB NVMe | AWS c6i.2xlarge / GCP c2-standard-8 |
| **High Throughput / Scale** | 1,000+ | 16 vCPU | 32 GB | 2 TB NVMe | AWS c6i.4xlarge + S3/Cloudflare R2 |

*Note on Hardware Acceleration:* For GPU-accelerated video rendering, configure FFmpeg with NVIDIA NVENC (`h264_nvenc`) or Intel QuickSync (`h264_qsv`).

---

## 3. Environment Variables & Secret Configuration

Copy `.env.example` to `.env` on your deployment server:

```bash
cp .env.example .env
chmod 600 .env
```

### Critical Production Secrets:
- `JWT_SECRET_KEY`: Generate a 256-bit hexadecimal key:
  ```bash
  openssl rand -hex 32
  ```
- `PAYMENT_WEBHOOK_SECRET`: Secret key provided by Stripe / payment provider webhook dashboard.
- `YOUTUBE_CLIENT_ID` & `YOUTUBE_CLIENT_SECRET`: Configured in Google Cloud Console with authorized redirect URI: `https://yourdomain.com/publishing`.
- `OPENAI_API_KEY`: API key for Whisper speech transcription.
- `ANTHROPIC_API_KEY`: API key for Claude 3.5 Sonnet moment detection and viral hook ranking.
- `GEMINI_API_KEY`: API key for content intelligence and niche analysis.

---

## 4. Production Deployment via Docker Compose

### Step 1: Clone and Configure
```bash
git clone https://github.com/your-org/youtubeshortsgenerator.git /opt/shorts_factory
cd /opt/shorts_factory
cp .env.example .env
# Edit .env with your production credentials
nano .env
```

### Step 2: Build and Launch Containers
```bash
docker compose build --pull
docker compose up -d
```

### Step 3: Verify Container Health
```bash
docker compose ps
docker compose logs -f backend
```

---

## 5. Reverse Proxy & SSL Configuration (Nginx + Let's Encrypt)

Install Certbot for automated Let's Encrypt certificates:
```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Ensure Nginx has the rate limiting and 500M file upload configurations active in `/etc/nginx/nginx.conf` (see `nginx/nginx.conf`).

---

## 6. Automated Database Backup & Disaster Recovery

### Automated Backup Runner
The repository includes an atomic, non-blocking SQLite snapshot script:
`scripts/backup_database.py`

Test manual backup:
```bash
./scripts/backup_database.sh
```

### Configure System Crontab (Run every 6 hours):
```bash
sudo crontab -e
```
Add line:
```cron
0 */6 * * * /opt/shorts_factory/scripts/backup_database.sh >> /var/log/shorts_factory_backup.log 2>&1
```

### Restoration Procedure:
To restore from a backup snapshot:
1. Stop backend services:
   ```bash
   docker compose stop backend worker
   ```
2. Copy backup snapshot over active database:
   ```bash
   cp /opt/shorts_factory/backups/shorts_factory_backup_YYYYMMDD_HHMMSS.db /opt/shorts_factory/backend/shorts_factory.db
   ```
3. Run SQLite integrity check:
   ```bash
   sqlite3 /opt/shorts_factory/backend/shorts_factory.db "PRAGMA integrity_check;"
   ```
4. Restart services:
   ```bash
   docker compose start backend worker
   ```

---

## 7. Diagnostics, Health Monitoring & Super Admin Operations

- **API Health Check Probe:**
  `GET https://yourdomain.com/api/v1/health`
  Returns real-time diagnostics: database latency, disk storage free, queue latency, and YouTube API connectivity.
- **Super Admin Dashboard:**
  `https://yourdomain.com/admin`
  Root login: `admin@shortsfactory.io` (password configured during seed or via environment).
- **Maintenance Mode:**
  Can be toggled instantly from `/admin/settings`. When enabled, all non-admin creator routes gracefully respond with HTTP 503 and custom maintenance announcement.

---

## 8. Incident Troubleshooting Runbook

| Incident | Cause | Remediation |
|---|---|---|
| **402 Payment Required on Upload** | User exceeded monthly video processing quota | Upgrade plan via `/billing` or adjust credits in `/admin/credits`. |
| **403 Forbidden on Publishing** | Creator plan does not include YouTube publishing | User must upgrade to Pro plan or admin can enable feature flag. |
| **Video Processing Queue Stall** | Worker out of memory or corrupted input codec | Inspect job traceback in `/admin/jobs` and click "Retry Job". |
| **YouTube Token Expired** | Refresh token revoked by creator | Reconnect YouTube channel from `/publishing` or trigger OAuth refresh. |
| **504 Gateway Timeout on Render** | High-res 4K multitrack export exceeded HTTP timeout | Exports run asynchronously in worker thread; check status via `/api/v1/exports/status/{job_id}`. |

