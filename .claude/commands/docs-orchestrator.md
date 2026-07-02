---
description: Orquesta 4 subagentes en paralelo para generar toda la documentación técnica (API, diagramas, cobertura de tests, esquema de BD) y ensambla un sitio MkDocs.
allowed-tools: Agent, Read, Write, Bash(mkdir*), Bash(ls*)
---

Eres el orquestador de documentación del Mini Jira. Tu trabajo tiene dos fases estrictas: **fan-out paralelo** y **ensamblado**.

## Fase 1 — Fan-out (obligatorio en un único bloque, 4 llamadas simultáneas)

Lanza los 4 subagentes con la herramienta `Agent`, usando su `subagent_type` real (no `general-purpose` — ya están registrados en `.claude/agents/` con su propio nombre, descripción y `tools`), **las 4 en el mismo mensaje/bloque de tool calls** (no las lances una tras otra esperando resultado — deben ejecutarse en paralelo nativo). No hace falta pasarles el contenido del archivo como prompt: el subagente ya trae su propio rol/tarea/restricciones desde su definición; el `prompt` solo debe indicar el directorio raíz de trabajo si hace falta contexto adicional puntual.

1. `subagent_type: "api-doc-generator"` — `description: "Documenta endpoints de la API"`
2. `subagent_type: "diagrams-generator"` — `description: "Genera diagramas Mermaid"`
3. `subagent_type: "tests-checker"` — `description: "Audita cobertura de tests"`
4. `subagent_type: "db-docs-generator"` — `description: "Documenta esquema de BD"`

Cada agente escribe su propio archivo de salida en `docs/` (`api-reference.md`, `diagramas.md`, `cobertura-tests.md`, `base-de-datos.md`) y no depende de los otros tres. No los inicies secuencialmente ni esperes a uno para lanzar el siguiente.

Si el agente de BD responde "No encontrado" (no existe `backend/database-schema.yaml` ni `docs/init_db.sql`), continúa igual con los otros 3 — no es un error fatal.

## Fase 2 — Ensamblado (solo después de que los 4 hayan terminado)

Cuando las 4 tareas hayan devuelto resultado:

1. Verifica qué archivos existen realmente en `docs/` (`ls docs/*.md`) — no asumas que todos se generaron.
2. Genera `mkdocs.yml` en la raíz del repo con esta estructura base (ajusta `nav` para omitir cualquier página que no se haya generado):

```yaml
site_name: Mini Jira — Documentación Técnica
theme:
  name: material
nav:
  - Inicio: index.md
  - API Reference: api-reference.md
  - Diagramas: diagramas.md
  - Cobertura de Tests: cobertura-tests.md
  - Base de Datos: base-de-datos.md
```

3. Genera `docs/index.md`: una portada breve con un párrafo de introducción al proyecto Mini Jira y una lista enlazada a cada documento generado (con una línea describiendo qué contiene cada uno). No dupliques contenido de los otros documentos, solo enlaza.

## Reglas

- No modifiques código fuente en ninguna fase — todos los agentes son de solo documentación/auditoría.
- No inventes contenido si un subagente falla o no encuentra su fuente; refleja la ausencia en `index.md` y `mkdocs.yml` en vez de fabricar datos.
- Reporta al final, en 2-3 líneas, qué documentos se generaron y cuáles se omitieron.
