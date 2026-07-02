# Mini Jira

Tablero Kanban de gestión de tickets: autenticación JWT propia, bloqueo optimista sobre tickets, columnas Por hacer / En progreso / Bloqueado / Listo.

## Tabla de contenido

- [Stack](#stack)
- [Ejecutar el backend](#ejecutar-el-backend)
- [Ejecutar el frontend](#ejecutar-el-frontend)
- [Documentación generada (orquestador de subagentes)](#documentación-generada-orquestador-de-subagentes)
  - [Ejecutar el orquestador](#ejecutar-el-orquestador)
  - [Qué hace cada subagente](#qué-hace-cada-subagente)
  - [Ver la documentación generada](#ver-la-documentación-generada)

---

## Stack

- **Backend real**: `backend/` — Next.js 14 + Supabase (`@supabase/supabase-js`), JWT propio, OpenAPI en `/api/docs`.
- **Frontend real**: `frontend/apps/web` — React 18 + Vite + TS, TanStack Query, Zustand, `@dnd-kit`.
- `frontend/apps/api` (Express + Prisma) queda solo como referencia histórica, no se usa para correr la app.

---

## Ejecutar el backend

```bash
cd backend
npm install
cp .example.env .env.local   # completar SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, JWT_REFRESH_SECRET
npm run dev                  # levanta en http://localhost:3001
```

Otros comandos útiles: `npm run typecheck`, `npm run test` (Vitest), `npm run build`.

---

## Ejecutar el frontend

```bash
cd frontend/apps/web
npm install
npm run dev                  # levanta en http://localhost:5173 (Vite)
```

Asegúrate de que el backend esté corriendo en `http://localhost:3001` y que `FRONTEND_ORIGIN` en `backend/.env.local` apunte a `http://localhost:5173`.

Otros comandos útiles: `npm run typecheck`, `npm run lint`, `npm run build`.

---

## Documentación generada (orquestador de subagentes)

El comando `/docs-orchestrator` lanza 4 subagentes **en paralelo** (uno por cada área técnica) y luego ensambla un sitio [MkDocs](https://www.mkdocs.org/) con todo lo generado.

### Ejecutar el orquestador

Desde Claude Code, dentro del repo:

```
/docs-orchestrator
```

Esto:
1. Lanza los 4 subagentes a la vez (fan-out paralelo, ninguno espera a otro).
2. Cuando los 4 terminan, genera `mkdocs.yml` (raíz del repo) y `docs/index.md` con enlaces a cada documento producido, omitiendo del menú cualquier página que no se haya podido generar.

Para ver el resultado renderizado (opcional, requiere Python):

```bash
python3 -m venv .mkdocs-venv
./.mkdocs-venv/bin/pip install mkdocs mkdocs-material
./.mkdocs-venv/bin/mkdocs serve -a 127.0.0.1:8765
# abrir http://127.0.0.1:8765/
```

### Qué hace cada subagente

Definidos en `.claude/agents/`, invocables por su `subagent_type`:

| Subagente | Rol | Fuente que lee | Genera |
|---|---|---|---|
| `api-doc-generator` | Documenta los endpoints REST de la API | `backend/api-contract.md` | `docs/api-reference.md` — tabla de endpoints, ejemplos `curl` para los P0, flujo de autenticación JWT |
| `diagrams-generator` | Genera diagramas técnicos | `docs/architecture-c4.mermaid`, `docs/architecture-sequence.mermaid`, `docs/specs.md`, rutas en `backend/src/app/api/` | `docs/diagramas.md` — 3 diagramas Mermaid: login JWT, mover ticket entre columnas, ciclo de vida del ticket |
| `tests-checker` | Audita cobertura de pruebas | `docs/backlog.md` (Gherkin) vs. `*.test.ts` en `backend/src/__tests__/` | `docs/cobertura-tests.md` — historias vs. estado de cobertura, edge cases sin test, top 3 deuda técnica |
| `db-docs-generator` | Documenta el esquema de base de datos | `backend/database-schema.yaml`, `docs/init_db.sql` | `docs/base-de-datos.md` — ERD en Mermaid, tabla de columnas/constraints, decisiones de diseño (soft delete, locking, auditoría) |

Todos son de **solo lectura/documentación**: ninguno modifica código fuente ni tests existentes.

### Ver la documentación generada

Una vez ejecutado el orquestador, la documentación queda en `docs/*.md` y se navega desde `docs/index.md` o vía MkDocs (ver arriba).
