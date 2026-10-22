#!/usr/bin/env bash
set -euo pipefail
[[ $EUID -eq 0 && $# -eq 2 ]] || { echo 'Usage: sudo kabita-harden <LAB_WEB_CIDR> <ADMIN_IP>'; exit 1; }
LAB_WEB_CIDR=$1
ADMIN_IP=$2
IPV4='^([0-9]{1,3}\.){3}[0-9]{1,3}$'
CIDR4='^([0-9]{1,3}\.){3}[0-9]{1,3}/([0-9]|[12][0-9]|3[0-2])$'
[[ "$LAB_WEB_CIDR" =~ $CIDR4 && "$ADMIN_IP" =~ $IPV4 ]] || { echo 'Use an IPv4 CIDR for the lab and an IPv4 address for the admin.'; exit 1; }
[[ -s /home/kel7target/.ssh/authorized_keys ]] || { echo 'Install and TEST the recipient SSH public key first.'; exit 1; }
install -d -m 755 /etc/ssh/sshd_config.d
cat > /etc/ssh/sshd_config.d/00-kabita-lab.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
AllowUsers kel7target
EOF
sshd -t
systemctl reload ssh
# Apply explicit recipient-provided allowlists. Run from the VM console during OVA setup.
ufw allow from 10.0.3.2 to any port 22 proto tcp comment 'KABITA host management NAT'
ufw allow from "$ADMIN_IP" to any port 22 proto tcp comment 'KABITA host management admin'
ufw allow from "$LAB_WEB_CIDR" to any port 8080 proto tcp comment 'KABITA lab web'
ufw default deny incoming
ufw default allow outgoing
ufw --force enable
ufw status verbose
sshd -T | grep -E '^(permitrootlogin|passwordauthentication|pubkeyauthentication) '
echo 'Applied. Verify SSH key access and web reachability before closing the VM console.'
