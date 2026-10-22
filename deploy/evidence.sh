#!/usr/bin/env bash
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo 'Use sudo kabita-evidence'; exit 1; }
echo '=== UTC timestamp ==='; date -u -Is
echo '=== OS ==='; cat /etc/os-release
echo '=== Application mode (no secrets) ==='; grep -E '^(LAB_MODE|DB_BACKEND|HOST|PORT)=' /etc/kabita-lab/app.env
echo '=== SSH effective settings ==='; sshd -T | grep -E '^(permitrootlogin|passwordauthentication|pubkeyauthentication) '
echo '=== Firewall ==='; ufw status verbose
echo '=== Listening ports ==='; ss -lntp
echo '=== Service ==='; systemctl show kabita-lab -p ActiveState -p User -p NoNewPrivileges -p ProtectSystem -p MemoryMax
echo '=== Fail2ban ==='; fail2ban-client status sshd
echo '=== File permissions ==='; stat -c '%a %U %G %n' /etc/kabita-lab/app.env
echo '=== Health and headers ==='; curl -sS -i http://127.0.0.1:8080/api/health
echo; echo '=== Recent application logs ==='; journalctl -u kabita-lab -n 30 --no-pager -o cat
