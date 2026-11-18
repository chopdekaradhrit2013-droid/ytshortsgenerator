#!/usr/bin/env python3
"""
AI Shorts Factory - Production Database Automated Backup Script
Uses SQLite's online backup API (conn.backup) to safely create non-blocking,
atomic snapshots of the database while transactions are active.
"""

import os
import sys
import sqlite3
import datetime
import shutil

# Add project root to path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, PROJECT_ROOT)

from backend.app.core.config import settings

def perform_database_backup(destination_dir: str = None) -> str:
    source_db_path = settings.DATABASE_PATH
    if not os.path.exists(source_db_path):
        raise FileNotFoundError(f"Source database not found at {source_db_path}")

    backup_dir = destination_dir or os.path.join(PROJECT_ROOT, "backups")
    os.makedirs(backup_dir, exist_ok=True)

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file_name = f"shorts_factory_backup_{timestamp}.db"
    backup_path = os.path.join(backup_dir, backup_file_name)

    print(f"[*] Starting atomic online backup: {source_db_path} -> {backup_path}")

    # Open source in read-only mode to prevent any unintended writes during snapshot
    src_conn = sqlite3.connect(f"file:{source_db_path}?mode=ro", uri=True)
    dst_conn = sqlite3.connect(backup_path)

    try:
        # Perform online backup: copies pages in steps without blocking writer transactions
        with dst_conn:
            src_conn.backup(dst_conn, pages=100)
        print("[+] Online SQLite snapshot completed.")
    finally:
        dst_conn.close()
        src_conn.close()

    # Verify backup integrity using PRAGMA integrity_check
    verify_conn = sqlite3.connect(backup_path)
    try:
        result = verify_conn.execute("PRAGMA integrity_check;").fetchall()
        if len(result) == 1 and result[0][0] == "ok":
            print(f"[✓] Backup verified: PRAGMA integrity_check = ok ({os.path.getsize(backup_path)} bytes)")
        else:
            raise RuntimeError(f"Backup integrity verification failed: {result}")
    finally:
        verify_conn.close()

    return backup_path

def prune_old_backups(backup_dir: str = None, keep_count: int = 14):
    """Keep the last N backups and prune older ones."""
    dir_path = backup_dir or os.path.join(PROJECT_ROOT, "backups")
    if not os.path.exists(dir_path):
        return

    files = [
        os.path.join(dir_path, f) for f in os.listdir(dir_path)
        if f.startswith("shorts_factory_backup_") and f.endswith(".db")
    ]
    files.sort(key=os.path.getmtime, reverse=True)

    if len(files) > keep_count:
        for old_file in files[keep_count:]:
            try:
                os.remove(old_file)
                print(f"[-] Pruned old backup: {os.path.basename(old_file)}")
            except Exception as e:
                print(f"[!] Warning: Failed to prune {old_file}: {e}")

if __name__ == "__main__":
    backup_path = perform_database_backup()
    prune_old_backups(keep_count=10)
    print(f"SUCCESS: Snapshot archived at {backup_path}")

