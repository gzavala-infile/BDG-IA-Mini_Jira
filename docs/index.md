# Mini Jira — Documentación Técnica

Mini Jira es un tablero Kanban de gestión de tickets con autenticación JWT propia, bloqueo optimista/pesimista sobre tickets y un backend en Next.js sobre Supabase. Esta documentación se generó automáticamente a partir del código y las specs del repositorio mediante 4 agentes especializados ejecutados en paralelo.

## Contenido

- **[API Reference](api-reference.md)** — Tabla completa de los 17 endpoints del contrato (método, ruta, auth, body, responses), ejemplos `curl` para los endpoints P0 y el flujo de autenticación JWT (login → token → refresh).
- **[Diagramas](diagramas.md)** — Tres diagramas Mermaid extraídos del código real: secuencia de autenticación JWT, secuencia de mover un ticket entre columnas (con lock pesimista + `audit_log`), y el ciclo de vida de un ticket (Por hacer → En progreso → Bloqueado → Listo).
- **[Cobertura de Tests](cobertura-tests.md)** — Auditoría de las historias del backlog (formato Gherkin) contra los tests existentes en `backend/src/__tests__/`, con 22 escenarios sin cobertura y el top 3 de deuda técnica de testing por criticidad de negocio.
- **[Base de Datos](base-de-datos.md)** — Diagrama ERD, tabla de columnas/constraints por entidad y las decisiones de diseño (soft delete, bloqueo optimista por `version`, inmutabilidad de auditoría).

## Nota sobre una discrepancia detectada

El agente de **Base de Datos** documentó el esquema a partir de `backend/database-schema.yaml` y `docs/init_db.sql`, que no definen una tabla `audit_log` ni un mecanismo de lock explícito. Sin embargo, el agente de **Diagramas**, trabajando directamente sobre el código (`backend/src/app/api/tickets/[id]/lock/route.ts`, `backend/src/app/api/audit/[ticketId]/route.ts`, función RPC `patch_ticket_atomic`), confirmó que **ambos sí existen** en el backend desplegado — probablemente vía migraciones de Supabase no reflejadas en los archivos estáticos de esquema. Si vas a confiar en `base-de-datos.md` como fuente de verdad del esquema, valida contra la base de datos real (`mcp__supabase__list_tables`) antes de tomar decisiones.
