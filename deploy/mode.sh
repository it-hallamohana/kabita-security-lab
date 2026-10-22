#!/usr/bin/env bash
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo 'Use sudo kabita-mode hardened|vulnerable'; exit 1; }
case "${1:-}" in hardened|vulnerable) ;; *) echo 'Usage: sudo kabita-mode hardened|vulnerable'; exit 1;; esac
sed -i "s/^LAB_MODE=.*/LAB_MODE=$1/" /etc/kabita-lab/app.env
systemctl restart kabita-lab
logger -t kabita-lab "Training mode changed to $1"
curl --fail --retry 5 --retry-delay 1 --retry-connrefused http://127.0.0.1:8080/api/health
echo; echo "Mode: $1. All sessions revoked by service restart."
