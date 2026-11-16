#!/usr/bin/env python3
"""
Ward-Beck Systems XTM-4 — FTP Deployment Script
==============================================
Deploys the XTM.WBSps.ca standalone application to the remote server (WBSps.ca).
- Automatically loads credentials from docker/.env or local environment.
- Recursively creates remote directories and uploads HTML, JS, CSS, SVG, PNG, and .htaccess.
- Verifies remote deployment over HTTPS.

Usage:
  python3 deploy.py                      # Deploy to remote server
  python3 deploy.py --remote-dir /       # Deploy to root
  python3 deploy.py --remote-dir /XTM    # Deploy to /XTM subfolder
  python3 deploy.py --help
"""

import sys
import os
import ftplib
import argparse
import time
import urllib.request
import ssl
from pathlib import Path

HERE = Path(__file__).resolve().parent

# File / folder ignore list for public web deployment
IGNORE_ITEMS = {
    '.git',
    '.gitignore',
    '__pycache__',
    '.env',
    'server.py',
    'run.sh',
    'deploy.py',
    'deploy.sh',
    '.ftpquota'
}

def load_env_credentials():
    """Load credentials from environment or nearest .env file."""
    creds = {
        'host': os.environ.get('FTP_HOST', 'wbsps.ca'),
        'user': os.environ.get('FTP_USER_NAME', 'wbsps@wbsps.ca'),
        'pass': os.environ.get('FTP_USER_PASS', ''),
        'port': int(os.environ.get('FTP_PORT', '21'))
    }

    env_paths = [
        HERE / '.env',
        HERE.parent / 'docker' / '.env',
        HERE.parent / '.env'
    ]

    for p in env_paths:
        if p.is_file():
            try:
                for line in p.read_text(encoding='utf-8').splitlines():
                    line = line.strip()
                    if not line or line.startswith('#') or '=' not in line:
                        continue
                    k, v = line.split('=', 1)
                    k, v = k.strip(), v.strip().strip('"').strip("'")
                    if k in ('FTP_HOST', 'FTP_SERVER'):
                        creds['host'] = v
                    elif k in ('FTP_USER', 'FTP_USER_NAME', 'FTP_LOGIN'):
                        creds['user'] = v
                    elif k in ('FTP_PASS', 'FTP_USER_PASS', 'FTP_PASSWORD'):
                        creds['pass'] = v
                    elif k == 'FTP_PORT':
                        creds['port'] = int(v)
            except Exception:
                pass
            break

    return creds

def ensure_remote_dir(ftp, remote_path):
    """Ensure a directory path exists on the remote FTP server."""
    if remote_path in ('', '/', '.'):
        ftp.cwd('/')
        return

    parts = [p for p in remote_path.strip('/').split('/') if p]
    ftp.cwd('/')
    for part in parts:
        try:
            ftp.cwd(part)
        except ftplib.error_perm:
            try:
                ftp.mkd(part)
                ftp.cwd(part)
            except ftplib.error_perm as e:
                # May have been created concurrently or permission error
                try:
                    ftp.cwd(part)
                except Exception:
                    raise e

def upload_tree(ftp, local_dir, remote_base):
    """Recursively upload all files from local_dir to remote_base."""
    uploaded_files = []
    total_bytes = 0

    for root, dirs, files in os.walk(local_dir):
        # Filter out ignored directories
        dirs[:] = [d for d in dirs if d not in IGNORE_ITEMS and not d.startswith('.')]

        rel_dir = os.path.relpath(root, local_dir).replace('\\', '/')
        if rel_dir == '.':
            target_remote = remote_base
        else:
            target_remote = f"{remote_base.rstrip('/')}/{rel_dir}"

        ensure_remote_dir(ftp, target_remote)

        for fn in sorted(files):
            if fn in IGNORE_ITEMS or fn.startswith('.'):
                if fn != '.htaccess':
                    continue

            local_path = os.path.join(root, fn)
            file_size = os.path.getsize(local_path)
            rel_file = os.path.relpath(local_path, local_dir).replace('\\', '/')

            print(f"  ▲ Uploading {rel_file} ({file_size:,} bytes)...", end="", flush=True)
            with open(local_path, 'rb') as f:
                ftp.storbinary(f"STOR {fn}", f)
            print(" [OK]")

            uploaded_files.append(rel_file)
            total_bytes += file_size

    return uploaded_files, total_bytes

def verify_site(url, expected_str="XTM-4"):
    """Verify that the site responds over HTTPS."""
    print(f"\nVerifying {url}...")
    ctx = ssl.create_default_context()
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'Mozilla/5.0 (Ward-Beck Systems Deploy Verifier)'}
    )
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=8) as resp:
            status = resp.status
            body = resp.read(2048).decode('utf-8', errors='ignore')
            has_match = expected_str in body
            print(f"  ✔ HTTP {status} OK (content match '{expected_str}': {'YES' if has_match else 'NO'})")
            return status == 200 and has_match
    except Exception as e:
        print(f"  ⚠ Verification note: {e}")
        return False

def main():
    creds = load_env_credentials()

    parser = argparse.ArgumentParser(description="Deploy XTM.WBSps.ca to WBSps.ca via FTP")
    parser.add_argument("--host", default=creds['host'], help=f"FTP host (default: {creds['host']})")
    parser.add_argument("--port", type=int, default=creds['port'], help=f"FTP port (default: {creds['port']})")
    parser.add_argument("--user", default=creds['user'], help=f"FTP username (default: {creds['user']})")
    parser.add_argument("--password", default=creds['pass'], help="FTP password")
    parser.add_argument("--remote-dir", default=None,
                        help="Target remote directory (auto-detects 'XTM/' vs root)")
    parser.add_argument("--no-verify", action="store_true", help="Skip post-deployment HTTP verification")

    args = parser.parse_args()

    print("=" * 68)
    print(" Ward-Beck Systems — XTM.WBSps.ca Deployment")
    print("=" * 68)
    print(f" Target Server : {args.host}:{args.port}")
    print(f" FTP Account   : {args.user}")
    print(f" Local Source  : {HERE}")
    print("-" * 68)

    t0 = time.time()

    if not args.password:
        print("❌ Error: No FTP password provided. Set FTP_USER_PASS in docker/.env or pass --password.", file=sys.stderr)
        sys.exit(1)

    print(f"Connecting to {args.host}:{args.port}...")
    ftp = ftplib.FTP()
    try:
        ftp.connect(args.host, args.port, timeout=15)
        banner = ftp.getwelcome()
        print(f"Connected: {banner.splitlines()[0] if banner else 'OK'}")

        print(f"Authenticating as {args.user}...")
        ftp.login(args.user, args.password)
        print("Authentication successful!")

        # Auto-detect target directory:
        # If the account root contains 'XTM' directory or path says Wbsps.ca, deploy into XTM/
        remote_target = args.remote_dir
        if remote_target is None:
            listing = []
            try:
                listing = ftp.nlst()
            except Exception:
                pass

            if 'XTM' in listing:
                remote_target = '/XTM'
                print("Auto-detected target folder: '/XTM' (inside Wbsps.ca)")
            else:
                remote_target = '/'
                print("Auto-detected target folder: '/' (already inside XTM)")

        # Deploy files into target
        print(f"\nDeploying hosted application files to '{remote_target}'...")
        files_uploaded, bytes_uploaded = upload_tree(ftp, str(HERE), remote_target)
        print(f"✔ Completed '{remote_target}': {len(files_uploaded)} files ({bytes_uploaded:,} bytes)")

        ftp.quit()
        elapsed = time.time() - t0
        print(f"\nFTP transfer complete in {elapsed:.2f}s!")

    except Exception as e:
        print(f"\n❌ Deployment failed: {e}", file=sys.stderr)
        sys.exit(1)

    # Verification
    if not args.no_verify:
        verify_site("https://xtm.wbsps.ca/")

    print("\n" + "=" * 68)
    print(" Hosted Deployment Complete!")
    print(" Live URL: https://xtm.wbsps.ca/")
    print("=" * 68)

if __name__ == '__main__':
    main()
