#!/bin/sh
# Genera js/env.js en el arranque a partir de variables de entorno del contenedor.
# API_BASE_URL por defecto = /api (proxy inverso de nginx hacia el backend, evita CORS).
set -e
API_BASE_URL="${API_BASE_URL:-/api}"
# Si es relativa, se resuelve contra el origen del navegador.
cat > /usr/share/nginx/html/js/env.js <<JS
window.ENV = {
  API_BASE_URL: (function (u) { return /^https?:\/\//.test(u) ? u : window.location.origin + u; })("${API_BASE_URL}")
};
JS
echo "[env] API_BASE_URL=${API_BASE_URL}"
