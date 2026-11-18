#!/usr/bin/env bash
# ====================================================================
# AI Shorts Factory - Automated Database Snapshot Cron Runner
# Example crontab entry (run every 6 hours):
# 0 */6 * * * /Users/manishachopdekar/adhrit/youtubeshortsgenerator/scripts/backup_database.sh >> /var/log/shorts_factory_backup.log 2>&1
# ====================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

if [ -f "./venv/bin/python" ]; then
    PYTHON_EXEC="./venv/bin/python"
else
    PYTHON_EXEC="python3"
fi

$PYTHON_EXEC scripts/backup_database.py

