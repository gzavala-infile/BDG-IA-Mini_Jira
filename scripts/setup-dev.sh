#!/bin/bash
# setup-dev.sh — Prepara el entorno de desarrollo local.
# Pasos:
#   1. Instala dependencias en backend/ y frontend/ con npm
#   2. Crea .env desde .env.example si aún no existe
#   3. Verifica que la BD de Supabase responde (GET /health o psql)
#
# Uso:
#   ./scripts/setup-dev.sh            → configuración completa
#   ./scripts/setup-dev.sh --dry-run  → muestra qué haría, sin ejecutar

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

DRY_RUN=false
for arg in "$@"; do
  [[ "$arg" == "--dry-run" ]] && DRY_RUN=true
done

run() {
  if [[ "$DRY_RUN" == true ]]; then
    echo "  [dry-run] $*"
  else
    "$@"
  fi
}

echo "=== Mini Jira — setup-dev ==="
[[ "$DRY_RUN" == true ]] && echo "(modo dry-run: no se ejecuta nada)"

# ── 1. Crear .env si no existe ────────────────────────────────────────────────
ENV_FILE="$ROOT_DIR/.env"
ENV_EXAMPLE="$ROOT_DIR/.env.example"

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f "$ENV_EXAMPLE" ]]; then
    echo "→ Creando .env desde .env.example…"
    run cp "$ENV_EXAMPLE" "$ENV_FILE"
    echo "  AVISO: edita .env con tus credenciales reales antes de continuar."
  else
    echo "  AVISO: no existe .env.example; crea .env manualmente con:"
    echo "    SUPABASE_URL=https://<ref>.supabase.co"
    echo "    SUPABASE_SERVICE_ROLE_KEY=<service_role_key>"
    echo "    JWT_SECRET=<secreto>"
    echo "    JWT_REFRESH_SECRET=<otro_secreto>"
    echo "    FRONTEND_URL=http://localhost:5173"
    echo "    NEXT_PUBLIC_API_URL=http://localhost:3001"
  fi
else
  echo "→ .env ya existe — no se sobreescribe."
fi

# ── 2. Cargar variables de entorno ────────────────────────────────────────────
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs) 2>/dev/null || true
fi

# ── 3. Instalar dependencias — backend ────────────────────────────────────────
echo "→ Instalando dependencias de backend/ con npm ci…"
if [[ -d "$BACKEND_DIR" ]]; then
  run npm ci --prefix "$BACKEND_DIR"
else
  echo "  ERROR: directorio backend/ no encontrado en $BACKEND_DIR" >&2
  exit 1
fi

# ── 4. Instalar dependencias — frontend (monorepo Turborepo) ──────────────────
echo "→ Instalando dependencias de frontend/ con npm ci…"
if [[ -d "$FRONTEND_DIR" ]]; then
  run npm ci --prefix "$FRONTEND_DIR"
else
  echo "  AVISO: directorio frontend/ no encontrado — omitiendo."
fi

# ── 5. Migraciones (Supabase) ─────────────────────────────────────────────────
# Este proyecto usa Supabase como BD; las migraciones se aplican via
# Supabase CLI (supabase db push) o desde el dashboard.
# Si tienes supabase CLI instalado, descomenta las líneas siguientes:
#
#   echo "→ Aplicando migraciones con supabase CLI…"
#   run supabase db push --project-ref "${SUPABASE_PROJECT_REF:-}"
#
# Alternativa: aplicar el schema.sql manualmente en el SQL Editor de Supabase.

echo "→ Migraciones: usa el dashboard de Supabase o 'supabase db push'."
echo "  SQL de referencia: backend/database-schema.yaml"

# ── 6. Verificar que la BD responde ───────────────────────────────────────────
echo "→ Verificando conexión con la BD…"

HEALTH_URL="${NEXT_PUBLIC_API_URL:-http://localhost:3001}/api/health"

if [[ "$DRY_RUN" == true ]]; then
  echo "  [dry-run] curl -sf $HEALTH_URL"
elif command -v curl &>/dev/null && [[ -n "${NEXT_PUBLIC_API_URL:-}" ]]; then
  # Intentar health check si el backend ya está corriendo
  HTTP_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
  if [[ "$HTTP_STATUS" == "200" ]]; then
    echo "  ✓ Backend responde en $HEALTH_URL"
  else
    echo "  AVISO: backend no responde aún ($HTTP_STATUS). Inicia con: npm run dev --prefix backend/"
  fi
else
  # Verificar con psql si DATABASE_URL está disponible
  if [[ -n "${DATABASE_URL:-}" ]] && command -v psql &>/dev/null; then
    if psql "$DATABASE_URL" -c "SELECT 1" --no-password -q &>/dev/null; then
      echo "  ✓ BD accesible via psql."
    else
      echo "  ERROR: no se pudo conectar a la BD. Verifica DATABASE_URL en .env" >&2
      exit 1
    fi
  else
    echo "  AVISO: instala el backend ('npm run dev --prefix backend/') para verificar la BD."
  fi
fi

echo ""
echo "=== Setup completado ==="
echo ""
echo "  Para iniciar el backend:   npm run dev --prefix backend/"
echo "  Para iniciar el frontend:  npm run dev --prefix frontend/"
echo "  Para poblar la BD:         ./scripts/seed.sh"
