"""
Admin utility: set a user's password in Supabase.

Run server-side only. Requires the SERVICE_ROLE key, which bypasses
all Row Level Security. Never expose this key in frontend code or commit it.

Usage:
    # Set env vars first (PowerShell):
    #   $env:SUPABASE_URL = "https://xxxxx.supabase.co"
    #   $env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"

    python admin_set_password.py --email user@example.com --password "NewPass123!"

    # Or look the user up by their UUID instead of email:
    python admin_set_password.py --user-id 00000000-0000-0000-0000-000000000000 --password "NewPass123!"
"""

import argparse
import os
import sys

import httpx


def get_config():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit(
            "Missing config. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY "
            "environment variables before running."
        )
    return url.rstrip("/"), key


def find_user_id_by_email(base_url: str, key: str, email: str) -> str:
    """Look up a user's UUID from their email via the admin API."""
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    # GoTrue admin list-users endpoint supports filtering by email.
    resp = httpx.get(
        f"{base_url}/auth/v1/admin/users",
        headers=headers,
        params={"page": 1, "per_page": 200},
        timeout=30,
    )
    resp.raise_for_status()
    users = resp.json().get("users", [])
    for u in users:
        if (u.get("email") or "").lower() == email.lower():
            return u["id"]
    sys.exit(f"No user found with email: {email}")


def set_password(base_url: str, key: str, user_id: str, password: str) -> None:
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    resp = httpx.put(
        f"{base_url}/auth/v1/admin/users/{user_id}",
        headers=headers,
        json={"password": password},
        timeout=30,
    )
    if resp.status_code >= 400:
        sys.exit(f"Failed ({resp.status_code}): {resp.text}")
    print(f"Password updated for user {user_id}")


def main():
    parser = argparse.ArgumentParser(description="Set a Supabase user's password (admin).")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--email", help="User's email address")
    group.add_argument("--user-id", help="User's UUID")
    parser.add_argument("--password", required=True, help="New password")
    args = parser.parse_args()

    base_url, key = get_config()

    user_id = args.user_id or find_user_id_by_email(base_url, key, args.email)
    set_password(base_url, key, user_id, args.password)


if __name__ == "__main__":
    main()
