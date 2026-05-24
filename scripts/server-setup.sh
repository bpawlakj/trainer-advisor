#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Trainer Advisor — Hetzner CX22 bootstrap
#
# Run ONCE on a fresh Ubuntu 24.04 box, either via Hetzner cloud-init user
# data (paste this file's contents into the VM creation form) or by SSHing
# in as root and executing the script.
#
# After this script completes, the box has:
#   - Latest security patches + unattended-upgrades configured
#   - Docker + docker compose plugin installed
#   - UFW firewall: 22/80/443 open, rest denied
#   - Fail2ban watching SSH
#   - A non-root `deploy` user in the docker group, owning /home/deploy/app
#
# Next step (manual): add the GitHub Actions deploy SSH key to
# /home/deploy/.ssh/authorized_keys, then trigger the deploy workflow.
# ============================================================================

if [[ "${EUID}" -ne 0 ]]; then
  echo "[server-setup] must run as root" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

log() { printf '\n[server-setup] %s\n' "$*"; }

# ---------------------------------------------------------------------------
# 1. Base system: refresh package index, upgrade everything
# ---------------------------------------------------------------------------
log "Updating package index + upgrading existing packages"
apt-get update -y
apt-get upgrade -y

# ---------------------------------------------------------------------------
# 2. Core tools
# ---------------------------------------------------------------------------
log "Installing core tooling (docker, ufw, fail2ban, unattended-upgrades)"
apt-get install -y \
  ca-certificates curl gnupg lsb-release \
  ufw fail2ban unattended-upgrades apt-listchanges \
  htop tmux jq

# ---------------------------------------------------------------------------
# 3. Docker Engine + compose plugin (official Docker apt repo)
# ---------------------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker from docker.com apt repo"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
else
  log "Docker already installed — skipping"
fi

# ---------------------------------------------------------------------------
# 4. UFW: deny by default, allow only the three ports we need
# ---------------------------------------------------------------------------
log "Configuring UFW firewall"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   comment "SSH"
ufw allow 80/tcp   comment "HTTP (Caddy ACME)"
ufw allow 443/tcp  comment "HTTPS"
ufw allow 443/udp  comment "HTTP/3 (QUIC)"
ufw --force enable

# ---------------------------------------------------------------------------
# 5. Fail2ban: protect SSH
# ---------------------------------------------------------------------------
log "Enabling fail2ban SSH jail"
cat > /etc/fail2ban/jail.local <<'EOF'
[sshd]
enabled = true
port    = 22
maxretry = 5
findtime = 10m
bantime  = 1h
EOF
systemctl enable --now fail2ban

# ---------------------------------------------------------------------------
# 6. Unattended security upgrades — only -security pocket; nightly
# ---------------------------------------------------------------------------
log "Configuring unattended-upgrades for security patches"
cat > /etc/apt/apt.conf.d/51unattended-upgrades-trainer-advisor <<'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "03:00";
EOF
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
systemctl enable --now unattended-upgrades

# ---------------------------------------------------------------------------
# 7. Deploy user (non-root, in docker group)
# ---------------------------------------------------------------------------
if ! id deploy >/dev/null 2>&1; then
  log "Creating deploy user"
  adduser --disabled-password --gecos "" deploy
  usermod -aG docker deploy
  mkdir -p /home/deploy/.ssh /home/deploy/app
  touch /home/deploy/.ssh/authorized_keys
  chmod 700 /home/deploy/.ssh
  chmod 600 /home/deploy/.ssh/authorized_keys
  chown -R deploy:deploy /home/deploy/.ssh /home/deploy/app
else
  log "deploy user already exists — skipping"
fi

# ---------------------------------------------------------------------------
# 8. Done
# ---------------------------------------------------------------------------
log "Bootstrap complete."
cat <<'EOF'

Next steps:
  1. Paste your GitHub Actions deploy SSH public key into:
       /home/deploy/.ssh/authorized_keys
  2. Copy docker-compose.yml + Caddyfile + .env into /home/deploy/app/
     (the GitHub Actions deploy workflow does this).
  3. From your laptop: `ssh deploy@<host>` should now work.
  4. Trigger the deploy workflow in GitHub.

UFW status:
EOF
ufw status verbose
