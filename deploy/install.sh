#!/usr/bin/env bash
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo 'Run: sudo bash deploy/install.sh'; exit 1; }
SOURCE=$(cd "$(dirname "$0")/.." && pwd)
[[ -f "$SOURCE/dist/index.html" && -f "$SOURCE/server/app.mjs" ]] || { echo 'Build frontend before deployment.'; exit 1; }
install -d -m 750 /var/log/kabita-lab /etc/kabita-lab
exec > >(tee -a /var/log/kabita-lab/install.log) 2>&1
date -Is
echo '=== BEFORE: OS, sockets, SSH configuration ==='
cat /etc/os-release
ss -lntp
sshd -T | grep -E '^(permitrootlogin|passwordauthentication|pubkeyauthentication) ' || true
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y postgresql nginx fail2ban ufw curl ca-certificates xz-utils openssl
if ! command -v node >/dev/null || [[ $(node -p 'Number(process.versions.node.split(".")[0])') -lt 22 ]]; then
  TASK_TMP=$(mktemp -d)
  # HTTPS release metadata plus SHA-256 verification of the exact downloaded binary.
  curl --fail --silent --show-error https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt -o "$TASK_TMP/SHASUMS256.txt"
  NODE_ARCH=x64; [[ $(uname -m) == aarch64 ]] && NODE_ARCH=arm64
  NODE_FILE=$(awk -v arch="$NODE_ARCH" '$2 ~ "linux-" arch "\\.tar\\.xz$" {print $2}' "$TASK_TMP/SHASUMS256.txt")
  [[ "$NODE_FILE" =~ ^node-v24\.[0-9]+\.[0-9]+-linux-(x64|arm64)\.tar\.xz$ ]]
  curl --fail --silent --show-error "https://nodejs.org/dist/latest-v24.x/$NODE_FILE" -o "$TASK_TMP/$NODE_FILE"
  (cd "$TASK_TMP"; grep " $NODE_FILE$" SHASUMS256.txt | sha256sum -c -)
  tar -xJf "$TASK_TMP/$NODE_FILE" -C /opt
  ln -sfn "/opt/${NODE_FILE%.tar.xz}/bin/node" /usr/local/bin/node
  ln -sfn "/opt/${NODE_FILE%.tar.xz}/bin/npm" /usr/local/bin/npm
fi
NODE_BINARY=$(command -v node)
[[ "$NODE_BINARY" == /usr/local/bin/node ]] || ln -sfn "$NODE_BINARY" /usr/local/bin/node
id kabita >/dev/null 2>&1 || useradd --system --home /opt/kabita-lab --shell /usr/sbin/nologin kabita
install -d -m 755 /opt/kabita-lab
cp -a "$SOURCE/server" "$SOURCE/dist" /opt/kabita-lab/
cp "$SOURCE/server/package.json" "$SOURCE/server/package-lock.json" /opt/kabita-lab/
(cd /opt/kabita-lab; npm ci --omit=dev --ignore-scripts --no-audit --no-fund)
chown -R root:root /opt/kabita-lab
chmod -R a+rX /opt/kabita-lab
if [[ ! -f /etc/kabita-lab/app.env ]]; then
  DB_PASSWORD=$(openssl rand -hex 24)
  ADMIN_PASSWORD=$(openssl rand -hex 12)
  OPERATOR_PASSWORD=$(openssl rand -hex 12)
  DEVICE_TOKEN=$(openssl rand -hex 24)
  umask 077
  cat > /etc/kabita-lab/app.env <<EOF
DB_BACKEND=postgres
DATABASE_URL=postgresql://kabita_app:${DB_PASSWORD}@127.0.0.1:5432/kabita_lab
LAB_MODE=hardened
LAB_ACK=ISOLATED_DUMMY_ONLY
ADMIN_PASSWORD=${ADMIN_PASSWORD}
OPERATOR_PASSWORD=${OPERATOR_PASSWORD}
DEVICE_TOKEN=${DEVICE_TOKEN}
HOST=127.0.0.1
PORT=3000
STATIC_DIR=/opt/kabita-lab/dist
COOKIE_SECURE=false
EOF
  runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "CREATE ROLE kabita_app LOGIN PASSWORD '$DB_PASSWORD' NOSUPERUSER NOCREATEDB NOCREATEROLE;"
  runuser -u postgres -- createdb -O postgres kabita_lab
fi
runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d kabita_lab < "$SOURCE/deploy/schema.sql"
runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d kabita_lab <<'SQL'
REVOKE ALL ON DATABASE kabita_lab FROM PUBLIC;
GRANT CONNECT ON DATABASE kabita_lab TO kabita_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO kabita_app;
GRANT SELECT,INSERT,UPDATE ON public.kabita_lab_records TO kabita_app;
SQL
cp "$SOURCE/deploy/kabita-lab.service" /etc/systemd/system/kabita-lab.service
cp "$SOURCE/deploy/nginx.conf" /etc/nginx/sites-available/kabita-lab
ln -sfn /etc/nginx/sites-available/kabita-lab /etc/nginx/sites-enabled/kabita-lab
# Disable only Ubuntu's default web site if it is the standard symlink.
if [[ -L /etc/nginx/sites-enabled/default && $(readlink -f /etc/nginx/sites-enabled/default) == /etc/nginx/sites-available/default ]]; then
  unlink /etc/nginx/sites-enabled/default
fi
nginx -t
systemctl daemon-reload
systemctl enable --now kabita-lab
systemctl restart kabita-lab
systemctl reload nginx
cat > /etc/fail2ban/jail.d/kabita-sshd.local <<'EOF'
[sshd]
enabled = true
backend = systemd
maxretry = 5
findtime = 600
bantime = 600
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban
install -m 755 "$SOURCE/deploy/mode.sh" /usr/local/sbin/kabita-mode
install -m 755 "$SOURCE/deploy/evidence.sh" /usr/local/sbin/kabita-evidence
install -m 755 "$SOURCE/deploy/harden.sh" /usr/local/sbin/kabita-harden
if [[ ${SUDO_USER:-} =~ ^[a-z_][a-z0-9_-]*$ ]]; then
  # Only these root-owned, argument-restricted lab maintenance actions are delegated.
  printf '%s ALL=(root) NOPASSWD: /usr/local/sbin/kabita-mode hardened, /usr/local/sbin/kabita-mode vulnerable, /usr/local/sbin/kabita-evidence, /usr/local/sbin/kabita-harden\n' "$SUDO_USER" > /etc/sudoers.d/kabita-lab
  chmod 440 /etc/sudoers.d/kabita-lab
  visudo -cf /etc/sudoers.d/kabita-lab
fi
echo '=== AFTER: health and listening sockets ==='
curl --fail --retry 10 --retry-delay 2 --retry-connrefused http://127.0.0.1:8080/api/health
ss -lntp
echo
echo 'Installed in hardened mode. Secrets: /etc/kabita-lab/app.env (root only).'
echo 'Next: verify key SSH before disabling password login; configure lab-only firewall.'
