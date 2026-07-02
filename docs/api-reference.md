# API Reference — Mini Jira v1.0

**Base URL:** `http://localhost:3001`
**Autenticación:** Bearer token en header `Authorization: Bearer <accessToken>`
**Content-Type:** `application/json`

> Generado a partir de `backend/api-contract.md`. No se documentan endpoints que no estén definidos en ese contrato.

---

## Tabla de endpoints

| # | Método | Ruta | Auth | Body (campos) | Response | Status codes posibles |
|:---:|---|---|:---:|---|---|---|
| 1 | POST | `/api/auth/login` | No | `email`, `password` | `{ accessToken, refreshToken, user }` | 200, 400, 401 |
| 2 | POST | `/api/auth/refresh` | No | `refreshToken` | `{ accessToken }` | 200, 401 |
| 3 | POST | `/api/auth/logout` | Sí | `refreshToken` (opcional) | Sin body | 204 |
| 4 | GET | `/api/tickets` | Sí | Query params: `estado[]`, `prioridad[]`, `asignado_a`, `etiqueta[]`, `q`, `fecha_desde`, `fecha_hasta`, `archived` | `Ticket[]` | 200 |
| 5 | POST | `/api/tickets` | Sí | `titulo`, `descripcion?`, `prioridad?`, `asignado_a_id?`, `etiquetas?` | `Ticket` | 201, 400, 422 |
| 6 | GET | `/api/tickets/:id` | Sí | — | `Ticket & { comentarios: Comentario[] }` | 200, 404 |
| 7 | PATCH | `/api/tickets/:id` | Sí | `version` (requerido), `titulo?`, `descripcion?`, `estado?`, `prioridad?`, `asignado_a_id?`, `etiquetas?` | `Ticket` | 200, 400, 403, 404, 409, 422 |
| 8 | PATCH | `/api/tickets/:id/archive` | Sí | `{}` (vacío) | `Ticket` | 200, 403, 404 |
| 9 | GET | `/api/tickets/:ticketId/comments` | Sí | — | `Comentario[]` | 200, 404 |
| 10 | POST | `/api/tickets/:ticketId/comments` | Sí | `texto` | `Comentario` | 201, 400, 403, 404 |
| 11 | DELETE | `/api/tickets/:ticketId/comments/:commentId` | Sí | — | Sin body | 204, 403, 404 |
| 12 | GET | `/api/users` | Sí | — | `Usuario[]` | 200 |
| 13 | PATCH | `/api/tickets/:id/restore` | Sí | `{}` (vacío) | `Ticket` | 200, 403, 404 |
| 14 | POST | `/api/users` | Sí | `nombre`, `email`, `password`, `rol?` | `Usuario` | 201, 400, 403, 409 |
| 15 | PATCH | `/api/users/:id` | Sí | `nombre?`, `rol?`, `activo?` | `Usuario` | 200, 400, 403, 404 |
| 16 | GET | `/api/metrics` | Sí | Query params: `mes?`, `anio?` | Objeto de métricas agregadas | 200 |
| 17 | GET | `/api/health` | No | — | `{ ok: true }` | 200 |

### Códigos de error globales

| Código máquina | HTTP | Descripción |
|---|:---:|---|
| `validation` | 400 | Body inválido; `message` es el objeto `fieldErrors` de Zod |
| `unauthorized` | 401 | Token ausente, expirado o inválido |
| `invalid_credentials` | 401 | Email o contraseña incorrectos |
| `forbidden` | 403 | El usuario no tiene permiso para esa acción |
| `archived` | 403 / 409 | Operación no permitida en ticket archivado |
| `not_found` | 404 | Recurso no existe |
| `conflict` | 409 | Email ya registrado |
| `version_conflict` | 409 | Conflicto de edición optimista |
| `inactive_user` | 422 | Usuario destino está desactivado |

---

## Prioridades de implementación

- **P0** — Autenticación y tickets core (bloqueante): endpoints 1–8.
- **P1** — Comentarios, usuarios y restauración: endpoints 9–13.
- **P2** — Administración y métricas (solo Admin): endpoints 14–16.
- Sin prioridad asignada: `GET /api/health` (health check).

---

## Ejemplos de curl (endpoints P0)

### 1. `POST /api/auth/login`

No requiere `Authorization` (endpoint de login, aún no hay token).

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mini-jira.dev",
    "password": "admin123"
  }'
```

Respuesta 200 esperada:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>",
  "user": {
    "id": "u-admin-001",
    "nombre": "Admin Demo",
    "email": "admin@mini-jira.dev",
    "rol": "admin"
  }
}
```

### 2. `POST /api/auth/refresh`

No requiere `Authorization` (usa `refreshToken` en el body).

```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refresh_token>"
  }'
```

### 3. `POST /api/auth/logout`

```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refresh_token>"
  }'
```

### 4. `GET /api/tickets`

```bash
curl -X GET "http://localhost:3001/api/tickets?estado=por_hacer&estado=en_progreso&prioridad=alta" \
  -H "Authorization: Bearer {token}"
```

### 5. `POST /api/tickets`

```bash
curl -X POST http://localhost:3001/api/tickets \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Configurar CI",
    "descripcion": "Agregar GitHub Actions",
    "prioridad": "media",
    "asignado_a_id": "u-ana-002",
    "etiquetas": ["backend"]
  }'
```

### 6. `GET /api/tickets/:id`

```bash
curl -X GET http://localhost:3001/api/tickets/1 \
  -H "Authorization: Bearer {token}"
```

### 7. `PATCH /api/tickets/:id`

```bash
curl -X PATCH http://localhost:3001/api/tickets/1 \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "version": 3,
    "estado": "en_progreso",
    "prioridad": "alta"
  }'
```

### 8. `PATCH /api/tickets/:id/archive`

```bash
curl -X PATCH http://localhost:3001/api/tickets/1/archive \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Autenticación

Mini Jira usa un flujo de **JWT propio** (no SSO ni proveedores externos, fuera de scope en V1).

### Flujo: login → token → refresh

1. **Login** (`POST /api/auth/login`)
   El cliente envía `email` y `password`. Si son válidos y el usuario está activo, el servidor responde con:
   - `accessToken`: JWT de corta duración, usado para autenticar cada request subsiguiente.
   - `refreshToken`: JWT de larga duración, usado únicamente para renovar el `accessToken`.
   - `user`: datos básicos del usuario autenticado.

   Si el email no existe, el usuario está inactivo, o la contraseña es incorrecta, el servidor responde `401 invalid_credentials` con un mensaje genérico (no revela cuál de las condiciones falló, por seguridad).

2. **Uso del accessToken**
   Todas las rutas protegidas (marcadas "Requiere auth: Sí" en la tabla de endpoints) exigen el header:

   ```
   Authorization: Bearer <accessToken>
   ```

   Si el token está ausente, expirado o es inválido, el servidor responde `401 unauthorized`.

3. **Refresh** (`POST /api/auth/refresh`)
   Cuando el `accessToken` expira, el cliente envía el `refreshToken` almacenado a este endpoint. Si es válido y el usuario sigue activo, el servidor emite un nuevo `accessToken`. Este endpoint no requiere `Authorization` — la validación se hace sobre el `refreshToken` del body.

   Si el `refreshToken` está ausente, expirado, inválido, o el usuario fue desactivado, el servidor responde `401 unauthorized` y el cliente debe forzar un nuevo login.

4. **Logout** (`POST /api/auth/logout`)
   Requiere `Authorization: Bearer <accessToken>`. El cliente puede enviar el `refreshToken` en el body para invalidarlo en servidor; si se omite, solo se limpia la sesión del lado del cliente. Responde `204` sin body.

### Notas de almacenamiento (frontend)

Según las reglas de arquitectura del proyecto: el `accessToken` se mantiene en memoria (store Zustand) y el `refreshToken` se persiste en `localStorage`. Esto no está definido en `api-contract.md`, pero se documenta aquí como contexto operativo del flujo de autenticación.

---

## Notas sobre endpoints no-P0

- Los endpoints **P1** (`GET/POST /api/tickets/:ticketId/comments`, `DELETE .../comments/:commentId`, `GET /api/users`, `PATCH /api/tickets/:id/restore`) están completamente definidos en el contrato y son bloqueantes para HU-02, HU-03 y gestión de equipo, pero no se incluyen ejemplos de curl aquí por restricción de alcance de esta tarea (solo P0).
- Los endpoints **P2** (`POST /api/users`, `PATCH /api/users/:id`, `GET /api/metrics`) corresponden a administración y métricas, exclusivos de Admin. Están definidos en el contrato pero marcados como **P2 — pendiente de prioridad de implementación** respecto a P0/P1.
- `GET /api/health` no tiene prioridad asignada en el contrato; se documenta como endpoint utilitario sin auth.

Ningún endpoint fue inventado ni extrapolado más allá de lo especificado en `backend/api-contract.md`.
