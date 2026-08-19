#!/bin/bash
set -e

# ==============================================================================
# Setup script for developers.zayuno.uz on server 158.220.100.58
# ==============================================================================

echo "🚀 Setting up developers.zayuno.uz..."

# 1. Ensure build exists
cd /var/www/zayuno
pnpm --filter @zayuno/provider-portal build

# 2. Link Nginx configuration
sudo cp deploy/nginx-developers.conf /etc/nginx/sites-available/developers.zayuno.uz.conf
sudo ln -sf /etc/nginx/sites-available/developers.zayuno.uz.conf /etc/nginx/sites-enabled/

# 3. Test and obtain SSL with certbot if not existing
if [ ! -d "/etc/letsencrypt/live/developers.zayuno.uz" ]; then
    echo "🔒 Obtaining Let's Encrypt SSL certificate for developers.zayuno.uz..."
    sudo certbot --nginx -d developers.zayuno.uz --non-interactive --agree-tos -m admin@zayuno.uz
fi

# 4. Reload Nginx
sudo nginx -t
sudo systemctl reload nginx

echo "✅ developers.zayuno.uz is live and secured with SSL!"
