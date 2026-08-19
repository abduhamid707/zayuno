#!/bin/bash
echo "Starting DNS resolution loop for zayuno.uz..."
while true; do
    IP=$(dig +short @8.8.8.8 zayuno.uz)
    if [ "$IP" = "158.220.100.58" ]; then
        echo "DNS resolved successfully to $IP! Issuing Let's Encrypt SSL..."
        certbot certonly --nginx -d zayuno.uz -d www.zayuno.uz -d api.zayuno.uz -d mcp.zayuno.uz --non-interactive --agree-tos --register-unsafely-without-email
        if [ $? -eq 0 ]; then
            echo "SSL Certificate issued successfully! Updating Nginx..."
            sed -i 's|/etc/letsencrypt/live/shopla.uz/|/etc/letsencrypt/live/zayuno.uz/|g' /etc/nginx/sites-available/zayuno.conf
            nginx -t && nginx -s reload
            echo "ZAYUNO_SSL_READY"
            break
        fi
    fi
    echo "Waiting for global DNS propagation (current: $IP)..."
    sleep 20
done
