# Frontend estático servido por Nginx (no requiere build)
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/templates/default.conf.template
ENV BACKEND_HOST=backend BACKEND_PORT=3000 NGINX_ENVSUBST_FILTER=^BACKEND_
COPY docker/40-env.sh /docker-entrypoint.d/40-env.sh
RUN chmod +x /docker-entrypoint.d/40-env.sh
COPY index.html /usr/share/nginx/html/
COPY css /usr/share/nginx/html/css
COPY js /usr/share/nginx/html/js
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/healthz || exit 1
