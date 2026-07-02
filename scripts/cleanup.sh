#!/bin/bash
# cleanup.sh — Elimina datos de prueba y limpia archivos temporales.
# Trunca las tablas en orden correcto de FK (dependientes primero).
# Es idempotente: no falla si las tablas ya están vacías.
#
# Uso:
#   ./scripts/cleanup.sh            → limpieza real
#   ./scripts/cleanup.sh --dry-run  → muestra el SQL y los archivos sin ejecutar
#
# Requiere:
#   - psql instalado y en PATH
#   - DATABASE_URL en .env (postgresql://...) O SUPABASE_URL + SUPABASE_DB_PASSWORD

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

DRY_RUN=false
for arg in "$@"; do
  [[ "$arg" == "--dry-run" ]] && DRY_RUN=true
done

# ── Cargar variables de entorno ──────────────────────────────────────────────
ENV_FILE="$ROOT_DIR/.env"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs) 2>/dev/null || true
fi

# Construir DATABASE_URL desde SUPABASE_URL si no está definida directamente
if [[ -z "${DATABASE_URL:-}" && "$DRY_RUN" == false ]]; then
  if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
    echo "ERROR: Define DATABASE_URL o (SUPABASE_URL + SUPABASE_DB_PASSWORD) en .env" >&2
    exit 1
  fi
  PROJECT_REF=$(echo "$SUPABASE_URL" | sed 's|https://||' | cut -d'.' -f1)
  DATABASE_URL="postgresql://postgres.${PROJECT_REF}:${SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
fi

# ── SQL de limpieza ───────────────────────────────────────────────────────────
# Orden de truncado: primero las tablas que tienen FK apuntando a otras,
# luego las tablas referenciadas. CASCADE evita errores residuales.
SQL=$(cat <<'ENDSQL'
-- ============================================================
-- CLEANUP — Mini Jira v1.0
-- ============================================================

BEGIN;

TRUNCATE TABLE
  comentarios,          -- FK → tickets, usuarios
  ticket_etiquetas,     -- FK → tickets, etiquetas
  audit_log,            -- FK → tickets, usuarios (si existe)
  ticket_locks,         -- FK → tickets, usuarios (si existe)
  tickets,              -- FK → usuarios
  etiquetas,            -- sin dependencias salvo ticket_etiquetas (ya truncada)
  refresh_tokens,       -- FK → usuarios
  usuarios              -- tabla raíz
RESTART IDENTITY CASCADE;

COMMIT;

SELECT 'cleanup completado — filas restantes:' AS estado;

SELECT 'usuarios'         AS tabla, COUNT(*) AS filas FROM usuarios
UNION ALL
SELECT 'etiquetas',       COUNT(*) FROM etiquetas
UNION ALL
SELECT 'tickets',         COUNT(*) FROM tickets
UNION ALL
SELECT 'ticket_etiquetas',COUNT(*) FROM ticket_etiquetas
UNION ALL
SELECT 'comentarios',     COUNT(*) FROM comentarios
UNION ALL
SELECT 'refresh_tokens',  COUNT(*) FROM refresh_tokens;
ENDSQL
)

# ── Archivos tmp/ a eliminar ──────────────────────────────────────────────────
TMP_DIR="$ROOT_DIR/tmp"

echo "=== Mini Jira — cleanup ==="
[[ "$DRY_RUN" == true ]] && echo "(modo dry-run: no se ejecuta nada)"

# ── Ejecutar SQL ──────────────────────────────────────────────────────────────
if [[ "$DRY_RUN" == true ]]; then
  echo ""
  echo "=== SQL que se ejecutaría ==="
  echo "$SQL"
  echo "============================="
  echo "DATABASE_URL: ${DATABASE_URL:+(configurada)}"
else
  echo "→ Truncando tablas…"
  echo "$SQL" | psql "$DATABASE_URL" --no-password -v ON_ERROR_STOP=1
fi

# ── Limpiar tmp/ ──────────────────────────────────────────────────────────────
if [[ -d "$TMP_DIR" ]]; then
  if [[ "$DRY_RUN" == true ]]; then
    echo ""
    echo "=== Archivos en tmp/ que se borrarían ==="
    find "$TMP_DIR" -type f | sort || echo "  (directorio vacío)"
  else
    echo "→ Borrando archivos en tmp/…"
    find "$TMP_DIR" -type f -delete
    echo "  ✓ tmp/ limpio."
  fi
else
  echo "→ Directorio tmp/ no existe — nada que limpiar."
fi

if [[ "$DRY_RUN" == false ]]; then
  echo ""
  echo "✓ Cleanup completado."
fi
