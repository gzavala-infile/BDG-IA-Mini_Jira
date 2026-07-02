# Cobertura de Tests — Mini Jira Backend

**Rol:** Auditoría de cobertura de pruebas
**Fecha de auditoría:** 2026-07-01
**Fuentes:** [`docs/backlog.md`](backlog.md) (23 escenarios Gherkin + EC-03..EC-07) · [`docs/test_plan.md`](test_plan.md) · `backend/src/__tests__/tickets.test.ts` · `backend/src/__tests__/auth.test.ts`

> Metodología: cada escenario Gherkin del backlog se contrastó contra los `it(...)` existentes (leídos línea por línea, no solo por título) y, cuando fue necesario, contra el código de ruta real en `backend/src/app/api/**` para verificar si la regla de negocio existe en absoluto antes de juzgar el test como cobertura válida.

---

## 1. Historias del backlog vs. estado de cobertura

Leyenda: ✅ tiene test que verifica el criterio real · ⚠️ test parcial (existe un test relacionado pero no cubre el escenario exacto, usa un actor/condición distinto al del Gherkin, o solo cubre parte de las aserciones) · ❌ sin test.

### HU-01 — Autenticación de Usuario

| Escenario Gherkin | Test relacionado | Estado | Motivo |
|---|---|:---:|---|
| Login exitoso como Usuario | `auth.test.ts` → `POST /api/auth/login` "happy path" | ⚠️ | El test fija credenciales de **Admin** (`MOCK_USER_ROW.rol = 'admin'`); no existe un caso equivalente con rol `usuario`. La distinción de rol en el JWT nunca se ejercita para el camino "Usuario". |
| Login exitoso como Admin | mismo test que arriba | ✅ | Coincide con el fixture usado (rol admin, tokens y `user` sin `password_hash`). |
| Credenciales incorrectas (mensaje genérico) | `auth.test.ts` → "edge case — contraseña incorrecta..." | ✅ | Verifica 401 + `error: 'invalid_credentials'`. No se prueba el caso "email inexistente" (TP-01-03 pide ambos casos con el mismo mensaje); solo se prueba password incorrecta con email existente. |
| Sesión expirada → redirect sin perder URL | — | ❌ | Requiere e2e/manual (redirect es responsabilidad del frontend). Confirmado como manual en `test_plan.md` (TP-01-04). |
| Cierre de sesión invalida el token en servidor | `auth.test.ts` → `POST /api/auth/logout` | ⚠️ | Se prueba que logout devuelve 204, pero **no** hay un test encadenado que confirme que un `refresh` posterior con el mismo `refreshToken` falla (TP-01-05 exige exactamente esa secuencia). Los mocks se resetean entre `it()`, por lo que la invalidación real nunca se observa end-to-end dentro de la suite. |

### HU-02 — Gestión de Tickets

| Escenario Gherkin | Test relacionado | Estado | Motivo |
|---|---|:---:|---|
| Creación con campos mínimos (defaults) | `tickets.test.ts` → `POST /api/tickets` "happy path" | ✅ | Verifica `estado: 'por_hacer'`, `prioridad: 'media'`. |
| Creación con todos los campos + email al asignado | — | ❌ | No existe ningún test que envíe descripción, prioridad "Alta", asignado y 3 etiquetas juntos. Además **no hay sistema de email implementado** en el backend (ver §3) — el criterio "el usuario asignado recibe un email" es infeasible de cumplir tal como está el código hoy. |
| Edición de ticket propio (creador edita su propio ticket) | `tickets.test.ts` → `PATCH /api/tickets/:id` "happy path" | ⚠️ | El test usa `ADMIN_AUTH` editando un ticket cuyo `creado_por_id` es `'otro-usuario'` — ejercita el camino "admin edita cualquier ticket", no "el creador edita lo suyo" como Usuario. No hay caso con `USER_AUTH` + `creado_por_id === user.userId`. |
| Intento de edición de ticket ajeno como Usuario (título/descripción) | — | ❌ | El único test 403 relacionado con permisos está en el bloque de **archivado** ("usuario sin permiso retorna 403 (HU-02 S4)"), no en `PATCH` de título/descripción. La lógica de rechazo sí existe en el código (`if (!isAdmin && !isCreator) return forbidden` en `tickets/[id]/route.ts`), pero el escenario específico de edición de campos (no archivado) no tiene un test dedicado que lo ejercite con `USER_AUTH`. |
| Archivado de ticket propio (por el creador) | `tickets.test.ts` → `PATCH /api/tickets/:id/archive` "happy path" | ⚠️ | El test usa `ADMIN_AUTH` archivando un ticket de `'otro-usuario'`, no al creador archivando el suyo. Tampoco se verifica que el ticket "desaparece del tablero principal" (esto se prueba indirectamente en el filtro de `GET /api/tickets`, pero no en conjunto con el flujo de archivado). |
| Edición simultánea genera conflicto (bloqueo optimista) | `tickets.test.ts` → "edge case — conflicto de versión retorna 409 (HU-02 S6)" | ✅ | Verifica 409 `version_conflict`. Nota: es un test unitario con mocks secuenciales, no una prueba de concurrencia real con `Promise.all` como pide TP-02-06 — no se verifica la atomicidad real del `UPDATE`. |

### HU-03 — Tablero Kanban con Filtros

| Escenario Gherkin | Test relacionado | Estado | Motivo |
|---|---|:---:|---|
| Visualización del tablero completo (4 columnas, campos por tarjeta, sin archivados) | `tickets.test.ts` → `GET /api/tickets` "happy path" | ⚠️ | Solo verifica que se devuelve un array de tickets con campos básicos; no valida "4 columnas" (es un concepto de UI, correctamente marcado como manual en `test_plan.md`) ni que los archivados se excluyan explícitamente en este test (el `chainResult` mockeado no incluye tickets archivados para comprobar el filtro). |
| Cambio de estado de ticket propio + email al asignado | `tickets.test.ts` → `PATCH /api/tickets/:id` "happy path" | ⚠️ | Cambia `estado` correctamente, pero el actor es `ADMIN_AUTH` sobre ticket de `'otro-usuario'`, no "el creador" como dice el Gherkin. Tampoco hay aserción de envío de email (no implementado). |
| Intento de cambio de estado en ticket ajeno como Usuario | — | ❌ | Ningún test cubre `PATCH` de `estado` con `USER_AUTH` sin relación con el ticket esperando 403. |
| Filtro por un criterio (prioridad) | `tickets.test.ts` → "edge case — filtro por estado..." | ⚠️ | Cubre filtro por **estado**, pero el Gherkin (HU-03) pide filtro por **prioridad**. Filtro por prioridad no tiene test propio. |
| Filtros combinados (prioridad + asignado) | — | ❌ | Sin test. |
| Búsqueda de texto libre (título/descripción) | — | ❌ | Sin test de `?q=`. |
| Tablero sin resultados | — | ❌ | Sin test que verifique array vacío + status 200 cuando ningún ticket coincide con los filtros. |

### EC-01 — Archivado Concurrente Durante Edición Activa

| Escenario Gherkin | Test relacionado | Estado | Motivo |
|---|---|:---:|---|
| Admin archiva mientras Usuario A edita → guardado rechazado | `tickets.test.ts` → "edge case — EC-01: admin archiva; PATCH posterior..." | ✅ | Cubre exactamente el flujo: archive → PATCH posterior devuelve 403 `archived`. |
| Usuario abre ticket ya archivado desde pestaña vieja → solo lectura en UI | — | ❌ | Requiere e2e/frontend; confirmado manual en `test_plan.md` (TP-EC01-02). |

### EC-02 — Asignación a Usuario Desactivado

| Escenario Gherkin | Test relacionado | Estado | Motivo |
|---|---|:---:|---|
| Selector de "Asignado a" no muestra usuarios desactivados (UI) | — | ❌ | Frontend/manual, confirmado en `test_plan.md` (TP-EC02-01). |
| Reasignar un ticket **existente** vía API a usuario desactivado → 422 | — | ❌ | El código sí valida esto en `PATCH /api/tickets/[id]/route.ts` (`if (!asignado.activo) return errResponse('inactive_user', ...)`), pero el **test existente solo cubre la validación en creación (`POST`)**, no en reasignación vía `PATCH`. El Gherkin explícitamente habla de "reasignar un ticket existente (#17)", que es el camino `PATCH`, sin cobertura. |
| Desactivación de usuario con tickets asignados → tickets se preservan, se suprimen emails futuros | — | ❌ | No existe endpoint de gestión de usuarios (`/api/users`) en el backend, ni sistema de emails. El escenario completo no puede probarse porque la funcionalidad no está implementada (ver deuda técnica §3). |

---

## 2. Escenarios Gherkin sin cobertura (listado completo)

Incluye los 23 escenarios del backlog más los edge cases de riesgo (EC-03 a EC-07) descritos con Gherkin en `test_plan.md` §10.

1. **HU-01** — Sesión expirada → redirect sin perder URL. *(manual/e2e, sin test automatizado)*
2. **HU-01** — Cierre de sesión invalida el token en servidor **de extremo a extremo** (logout → refresh subsiguiente falla). *(existe test parcial de cada endpoint por separado, no la cadena)*
3. **HU-02** — Creación con todos los campos + email de notificación al asignado. *(sin test; funcionalidad de email no implementada)*
4. **HU-02** — Edición de ticket propio, ejercitada como Usuario (no Admin).
5. **HU-02** — Intento de edición de título/descripción en ticket ajeno como Usuario → rechazo (403).
6. **HU-02** — Archivado de ticket propio, ejercitado por el creador (no por Admin sobre ticket ajeno).
7. **HU-03** — Visualización del tablero: 4 columnas exactas, campos de tarjeta completos, exclusión de archivados. *(manual/e2e)*
8. **HU-03** — Cambio de estado de ticket propio + email de notificación al asignado.
9. **HU-03** — Intento de cambio de estado en ticket ajeno como Usuario → rechazo (403).
10. **HU-03** — Filtro por prioridad (el filtro probado es por estado, no por prioridad).
11. **HU-03** — Filtros combinados (prioridad + asignado).
12. **HU-03** — Búsqueda de texto libre en título/descripción.
13. **HU-03** — Tablero sin resultados (filtros sin coincidencias).
14. **EC-01** — Usuario edita desde pestaña abierta antes del archivado → solo lectura en UI. *(manual/e2e)*
15. **EC-02** — Selector de "Asignado a" excluye usuarios desactivados. *(manual/e2e, UI)*
16. **EC-02** — Reasignación de ticket **existente** vía `PATCH` a usuario desactivado → 422.
17. **EC-02** — Desactivación de usuario con tickets asignados: tickets se preservan + emails futuros suprimidos. *(funcionalidad no implementada: no hay endpoint de usuarios ni de email)*
18. **EC-03** — Idempotencia en `PATCH` tras reintento de red (Idempotency-Key). *(no implementado ni testeado)*
19. **EC-04** — Título vacío / solo espacios / ausente / >120 caracteres → 422 antes de tocar la BD. *(el schema Zod lo valida — `min(1)`/`max(120)` en `lib/shared.ts` — pero no hay test que ejercite estos casos explícitamente; el único test de validación de título es "sin título" 400, no cubre espacios en blanco ni el trim automático)*
20. **EC-05** — JWT válido de usuario recién desactivado debe ser rechazado (401) en cada request. *(crítico: ver deuda técnica §3 — ni siquiera está implementado en `auth-guard.ts`)*
21. **EC-06** — Atomicidad real del `UPDATE ... WHERE version = N` bajo escritura concurrente real (Promise.all / 50 escrituras simultáneas). *(el mecanismo existe vía RPC `patch_ticket_atomic`, pero solo se prueba con mocks secuenciales, nunca con concurrencia real)*
22. **EC-07** — Tormenta de emails en operaciones en cascada no bloquea la API ni genera 500 si el SMTP falla. *(no aplica aún: no hay sistema de email que probar)*

---

## 3. Deuda técnica de testing — Top 3 por criticidad para el negocio

### #1 — CRÍTICO: JWT de usuario desactivado no se rechaza (EC-05) — sin mitigación en código, sin test

`backend/src/lib/auth-guard.ts` (`getAuth`) solo verifica la firma del JWT y una blocklist de `jti` revocados por logout. **No consulta `usuarios.activo` en la base de datos.** Esto significa que un usuario desactivado por un Admin puede seguir usando su access token válido (hasta 1h) para leer y escribir tickets sin ninguna restricción del servidor — es exactamente el bypass de seguridad que `test_plan.md` clasifica como Risk Score 8 ("Crítico"). No solo falta el test: **falta la funcionalidad que el test debería validar.** Impacto de negocio: bypass de control de acceso post-desactivación, con exposición de datos y acciones no autorizadas mientras el token siga vigente.

### #2 — ALTO: Sin sistema de notificaciones por email — 3 escenarios de negocio no verificables (HU-02-S2, HU-03-S2, EC-02-S3)

No existe ningún módulo de envío de correo (`nodemailer`/`sendMail`) en el backend. Tres criterios de aceptación P1 del backlog dependen explícitamente de que se dispare un email ("el usuario asignado recibe un email de notificación"). Actualmente son imposibles de probar porque la funcionalidad no está construida, no porque falte el test. Esto además implica que EC-07 (tormenta de emails / resiliencia ante fallo de SMTP) tampoco tiene ningún código que auditar. Impacto de negocio: expectativa funcional documentada en el backlog (P1) que no se puede validar ni demostrar como cumplida antes de producción.

### #3 — ALTO: Reglas de permiso "creador vs. ajeno" solo se prueban desde el rol equivocado (HU-02-S3/S4, HU-03-S3)

El código de `PATCH /api/tickets/[id]` implementa correctamente `if (!isAdmin && !isCreator) return forbidden`, pero **ningún test en la suite usa `USER_AUTH`** contra un ticket ajeno para verificar el 403 en edición de campos o cambio de estado — los únicos 403 probados están en el endpoint de archivado. Esto deja sin cobertura automatizada justo el riesgo que `test_plan.md` marca como el más alto ("Permisos forzados solo en frontend | Alta | Crítico"): si una futura refactorización rompe la comprobación `isCreator` dentro de `PATCH` (por ejemplo al tocar la lógica de `asignado_a_id`), ningún test en CI lo detectaría porque el camino de "Usuario ajeno intenta editar/cambiar estado" nunca se ejecuta. Impacto de negocio: regresión silenciosa de un control de autorización de negocio (no solo de UI) sin alarma en CI.

---

## 4. Nota metodológica

- No se modificó ni creó ningún test durante esta auditoría, conforme a la restricción del encargo.
- Los estados ⚠️/❌ se determinaron leyendo el cuerpo de cada `it()` (actor usado, fixture, aserciones reales), no solo el título del test — varios títulos citan un ID de historia (p. ej. "HU-02 S4") que en realidad corresponde a un escenario distinto al etiquetado (ver HU-02-S4 en la tabla §1).
- Para los escenarios donde no fue evidente si el gap era "falta test" o "falta funcionalidad", se inspeccionó el código de ruta correspondiente (`backend/src/app/api/**`, `backend/src/lib/auth-guard.ts`, `backend/src/lib/token-blocklist.ts`) para distinguir ambos casos explícitamente.
