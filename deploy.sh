#!/bin/bash
# Capture Moments — deploy script buat dijalankan di VPS (aaPanel).
# Usage:
#   ./deploy.sh backend    -> pull + update backend Laravel
#   ./deploy.sh frontend   -> pull + rebuild + publish frontend React

set -e

BACKEND_DIR="/www/wwwroot/api-capture-moment.studiopoonya.net"
FRONTEND_SRC_DIR="/www/wwwroot/capture-moment-src"
FRONTEND_SITE_DIR="/www/wwwroot/capture-moment.studiopoonya.net"
FRONTEND_API_URL="https://api-capture-moment.studiopoonya.net/api"

deploy_backend() {
  echo ">> Update backend..."
  cd "$BACKEND_DIR"
  git pull origin main
  composer install --no-dev
  php artisan migrate --force
  php artisan config:clear
  php artisan cache:clear
  chown -R www:www storage bootstrap/cache
  echo ">> Backend selesai di-update."
}

deploy_frontend() {
  echo ">> Update frontend..."
  cd "$FRONTEND_SRC_DIR"
  git pull origin main
  cd frontend
  npm install
  VITE_API_URL="$FRONTEND_API_URL" npm run build
  rm -rf "${FRONTEND_SITE_DIR:?}"/*
  cp -r dist/. "$FRONTEND_SITE_DIR"/
  chown -R www:www "$FRONTEND_SITE_DIR"
  echo ">> Frontend selesai di-update."
}

case "$1" in
  backend)
    deploy_backend
    ;;
  frontend)
    deploy_frontend
    ;;
  all)
    deploy_backend
    deploy_frontend
    ;;
  *)
    echo "Usage: ./deploy.sh [backend|frontend|all]"
    exit 1
    ;;
esac
