#!/usr/bin/env bash
# Prueba de humo del contrato REST que consume el frontend.
# Uso: ./scripts/smoke-test.sh [API_BASE_URL] [recurso1 recurso2 ...]
#   ./scripts/smoke-test.sh http://localhost:3000 libros autores usuarios prestamos
set -u
BASE="${1:-http://localhost:3000}"; [ $# -gt 0 ] && shift
if [ $# -gt 0 ]; then RESOURCES=("$@"); else RESOURCES=(libros autores categorias usuarios prestamos); fi
UPDATE_METHOD="${UPDATE_METHOD:-PATCH}"
pass=0; fail=0

check() { # desc, esperado(regex), obtenido
  if [[ "$3" =~ $2 ]]; then echo "  ✅ $1 ($3)"; pass=$((pass+1)); else echo "  ❌ $1 (esperado $2, obtenido $3)"; fail=$((fail+1)); fi
}

echo "== Backend: $BASE"
code=$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS "$BASE/${RESOURCES[0]}" \
  -H "Origin: http://localhost:8080" -H "Access-Control-Request-Method: GET")
check "Preflight CORS" '^(200|204)$' "$code"

for r in "${RESOURCES[@]}"; do
  echo "== /$r"
  code=$(curl -s -o /tmp/list.json -w '%{http_code}' "$BASE/$r")
  check "GET /$r" '^200$' "$code"
done

# CRUD completo sobre el primer recurso solo si se habilita explícitamente (escribe en la BD)
if [ "${CRUD:-0}" = "1" ]; then
  r="${RESOURCES[0]}"
  DEFAULT_PAYLOAD='{"titulo":"Smoke test"}'
  payload="${PAYLOAD:-$DEFAULT_PAYLOAD}"
  echo "== CRUD /$r con payload $payload"
  body=$(curl -s -w '\n%{http_code}' -X POST "$BASE/$r" -H 'Content-Type: application/json' -d "$payload")
  code=$(tail -n1 <<<"$body"); json=$(head -n -1 <<<"$body")
  check "POST /$r" '^20[01]$' "$code"
  id=$(sed -n 's/.*"id"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p' <<<"$json" | head -n1)
  if [ -n "$id" ]; then
    check "GET /$r/$id" '^200$' "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/$r/$id")"
    check "$UPDATE_METHOD /$r/$id" '^200$' "$(curl -s -o /dev/null -w '%{http_code}' -X "$UPDATE_METHOD" "$BASE/$r/$id" -H 'Content-Type: application/json' -d "$payload")"
    check "DELETE /$r/$id" '^20[04]$' "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$BASE/$r/$id")"
  else
    echo "  ⚠️  No se encontró 'id' en la respuesta del POST; ajusta idField."
  fi
fi

echo "== Resultado: $pass OK, $fail fallidas"
[ "$fail" -eq 0 ]
