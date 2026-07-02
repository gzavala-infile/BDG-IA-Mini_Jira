#!/bin/bash
# seed.sh — Inserta datos de prueba en la BD de Supabase.
# Trunca primero en orden correcto de FK, luego inserta:
#   • 2 proyectos  (representados como etiquetas de proyecto en V1)
#   • 3 usuarios   (1 admin + 2 usuarios normales)
#   • 5 tickets    (estados variados)
#
# Uso:
#   ./scripts/seed.sh             → ejecuta contra la BD real
#   ./scripts/seed.sh --dry-run   → imprime el SQL sin ejecutar
#
# Requiere:
#   - psql instalado y en PATH
#   - DATABASE_URL en .env (postgresql://...) O SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY

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
  if [[ -z "${SUPABASE_URL:-}" ]]; then
    echo "ERROR: Define DATABASE_URL o SUPABASE_URL en .env" >&2
    exit 1
  fi
  # Formato Supabase pooler: postgresql://postgres.[ref]:[password]@aws-0-*.pooler.supabase.com:6543/postgres
  # El usuario puede definir SUPABASE_DB_PASSWORD separadamente
  if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
    echo "ERROR: Define DATABASE_URL o SUPABASE_DB_PASSWORD en .env" >&2
    echo "  DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-*.pooler.supabase.com:6543/postgres" >&2
    exit 1
  fi
  PROJECT_REF=$(echo "$SUPABASE_URL" | sed 's|https://||' | cut -d'.' -f1)
  DATABASE_URL="postgresql://postgres.${PROJECT_REF}:${SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
fi

# ── SQL ───────────────────────────────────────────────────────────────────────
SQL=$(cat <<'ENDSQL'
-- ============================================================
-- SEED — Mini Jira v1.0
-- ============================================================

BEGIN;

-- ── 1. Truncar en orden inverso de FK ──────────────────────
TRUNCATE TABLE
  comentarios,
  ticket_etiquetas,
  tickets,
  etiquetas,
  refresh_tokens,
  usuarios
RESTART IDENTITY CASCADE;

-- ── 2. Usuarios (3) ────────────────────────────────────────
-- password_hash corresponde a bcrypt('Password1!', 12) — solo para pruebas
INSERT INTO usuarios (id, nombre, email, password_hash, rol, activo)
VALUES
  ('00000000-0000-0000-0000-000000000001',
   'Ana García',
   'ana.garcia@minijira.dev',
   '$2a$12$6Kz1Qw2Rz3Tv4Ux5Vy6W.seed.hash.placeholder.admin0001',
   'admin',
   true),

  ('00000000-0000-0000-0000-000000000002',
   'Carlos López',
   'carlos.lopez@minijira.dev',
   '$2a$12$6Kz1Qw2Rz3Tv4Ux5Vy6W.seed.hash.placeholder.user0002',
   'usuario',
   true),

  ('00000000-0000-0000-0000-000000000003',
   'Diana Torres',
   'diana.torres@minijira.dev',
   '$2a$12$6Kz1Qw2Rz3Tv4Ux5Vy6W.seed.hash.placeholder.user0003',
   'usuario',
   false);  -- inactiva: prueba indicador visual "(inactivo)"

-- ── 3. Etiquetas / "proyectos" (2) ─────────────────────────
-- V1 no tiene tabla de proyectos; se representan como etiquetas
INSERT INTO etiquetas (nombre)
VALUES
  ('proyecto-alpha'),
  ('proyecto-beta');

-- ── 4. Tickets (5, estados variados) ───────────────────────
INSERT INTO tickets (titulo, descripcion, estado, prioridad, version, creado_por_id, asignado_a_id)
VALUES
  ('Configurar pipeline CI/CD',
   'Crear workflow de GitHub Actions con lint, type-check y tests.',
   'listo',
   'alta',
   3,
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002'),

  ('Diseñar pantalla de login',
   'Implementar formulario de login siguiendo el sistema de diseño Stitch.',
   'en_progreso',
   'alta',
   1,
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000002'),

  ('Agregar paginación en GET /api/tickets',
   'Soporte para parámetros ?page y ?limit. Máximo 50 por página.',
   'por_hacer',
   'media',
   1,
   '00000000-0000-0000-0000-000000000001',
   NULL),

  ('Revisar política de CORS',
   'Verificar headers CORS en producción. Bloqueado hasta confirmar dominios.',
   'bloqueado',
   'alta',
   2,
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000003'),

  ('Documentar endpoints de autenticación',
   'Añadir ejemplos de request/response en OpenAPI spec.',
   'por_hacer',
   'baja',
   1,
   '00000000-0000-0000-0000-000000000002',
   NULL);

-- ── 5. Asociar etiquetas a tickets ─────────────────────────
INSERT INTO ticket_etiquetas (ticket_id, etiqueta_id)
SELECT t.id, e.id
FROM tickets t, etiquetas e
WHERE t.titulo = 'Configurar pipeline CI/CD' AND e.nombre = 'proyecto-alpha';

INSERT INTO ticket_etiquetas (ticket_id, etiqueta_id)
SELECT t.id, e.id
FROM tickets t, etiquetas e
WHERE t.titulo = 'Diseñar pantalla de login' AND e.nombre = 'proyecto-beta';

INSERT INTO ticket_etiquetas (ticket_id, etiqueta_id)
SELECT t.id, e.id
FROM tickets t, etiquetas e
WHERE t.titulo = 'Agregar paginación en GET /api/tickets' AND e.nombre = 'proyecto-alpha';

COMMIT;

-- ── Verificación ───────────────────────────────────────────
SELECT 'usuarios' AS tabla, COUNT(*) AS filas FROM usuarios
UNION ALL
SELECT 'etiquetas',      COUNT(*) FROM etiquetas
UNION ALL
SELECT 'tickets',        COUNT(*) FROM tickets
UNION ALL
SELECT 'ticket_etiquetas', COUNT(*) FROM ticket_etiquetas;
ENDSQL
)

# ── Ejecutar o imprimir ───────────────────────────────────────────────────────
if [[ "$DRY_RUN" == true ]]; then
  echo "=== DRY RUN — SQL que se ejecutaría ==="
  echo "$SQL"
  echo "======================================="
  echo "DATABASE_URL: ${DATABASE_URL:+(configurada)}"
else
  echo "Seeding base de datos…"
  echo "$SQL" | psql "$DATABASE_URL" --no-password -v ON_ERROR_STOP=1
  echo "✓ Seed completado."
fi
