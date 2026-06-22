# API Contract — Mini Jira v1.0

**Fecha:** 2026-06-17  
**Base URL:** `http://localhost:3001`  
**Autenticación:** Bearer token en header `Authorization: Bearer <accessToken>`  
**Formato de datos:** `Content-Type: application/json`

---

## Convenciones globales

### Respuestas exitosas
Sin envelope. El recurso se devuelve directamente en el body.

```json
// Recurso único
{ "id": 1, "titulo": "...", ... }

// Colección
[ { "id": 1, ... }, { "id": 2, ... } ]
```

### Errores
```json
{
  "error": "<codigo_maquina>",
  "message": "<texto legible | objeto de errores de campo>"
}
```

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

### Tipos compartidos

```typescript
type EstadoTicket  = 'por_hacer' | 'en_progreso' | 'bloqueado' | 'listo'
type PrioridadTicket = 'alta' | 'media' | 'baja'
type Rol = 'admin' | 'usuario'

interface Usuario {
  id: string           // UUID
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  creado_en: string    // ISO 8601
  actualizado_en: string
}

interface Etiqueta {
  id: number
  nombre: string       // siempre lowercase
}

interface Ticket {
  id: number
  titulo: string
  descripcion: string | null
  estado: EstadoTicket
  prioridad: PrioridadTicket
  version: number
  archived_at: string | null
  creado_en: string
  actualizado_en: string
  creado_por: Usuario
  asignado_a: Usuario | null
  etiquetas: Etiqueta[]
  _count: { comentarios: number }
}

interface Comentario {
  id: number
  texto: string
  creado_en: string
  ticket_id: number
  autor: Usuario
}
```

---

## P0 — Autenticación y tickets core (bloqueante)

> Sin estos endpoints la app no arranca.

---

### Auth

#### `POST /api/auth/login`

Autentica un usuario y devuelve tokens JWT.  
**Requiere auth:** No

**Request body:**
```json
{
  "email": "admin@mini-jira.dev",   // string, email válido
  "password": "admin123"             // string, min 1 char
}
```

**Response 200:**
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

**Errores:**
| HTTP | error | Cuándo |
|:---:|---|---|
| 400 | `validation` | Body inválido |
| 401 | `invalid_credentials` | Email no existe, usuario inactivo, o contraseña incorrecta (mensaje genérico intencionalmente) |

---

#### `POST /api/auth/refresh`

Renueva el accessToken usando un refreshToken válido.  
**Requiere auth:** No

**Request body:**
```json
{
  "refreshToken": "<jwt>"
}
```

**Response 200:**
```json
{
  "accessToken": "<jwt>"
}
```

**Errores:**
| HTTP | error | Cuándo |
|:---:|---|---|
| 401 | `unauthorized` | refreshToken ausente, expirado, inválido o usuario inactivo |

---

#### `POST /api/auth/logout`

Invalida el refreshToken en servidor.  
**Requiere auth:** Sí

**Request body:**
```json
{
  "refreshToken": "<jwt>"   // opcional; si se omite solo expira la sesión cliente
}
```

**Response 204:** Sin body.

---

### Tickets

#### `GET /api/tickets`

Lista tickets activos (o archivados). Soporta filtros combinados.  
**Requiere auth:** Sí

**Query params:**

| Param | Tipo | Descripción |
|---|---|---|
| `estado` | `string[]` (repetible) | Filtrar por uno o más estados. Ej: `?estado=por_hacer&estado=en_progreso` |
| `prioridad` | `string[]` (repetible) | Filtrar por una o más prioridades |
| `asignado_a` | `string` (UUID) | Filtrar por usuario asignado |
| `etiqueta` | `string[]` (repetible) | Filtrar por nombre de etiqueta (exact match, lowercase) |
| `q` | `string` | Búsqueda de texto libre en `titulo` y `descripcion` |
| `fecha_desde` | `string` (ISO 8601) | Creados a partir de esta fecha |
| `fecha_hasta` | `string` (ISO 8601) | Creados hasta esta fecha |
| `archived` | `'true'` | Si está presente y es `'true'`, devuelve archivados; si no, devuelve activos |

**Response 200:** `Ticket[]` — ordenado por `creado_en` DESC.  
Los tickets con `archived_at !== null` nunca aparecen en la lista activa.

---

#### `POST /api/tickets`

Crea un ticket nuevo. El `estado` inicial es siempre `por_hacer`.  
**Requiere auth:** Sí

**Request body:**
```json
{
  "titulo": "string",           // requerido, 1–120 chars
  "descripcion": "string",      // opcional, nullable
  "prioridad": "media",         // opcional, default "media"; enum: alta | media | baja
  "asignado_a_id": "uuid",      // opcional, nullable; debe ser usuario activo
  "etiquetas": ["frontend"]     // opcional, default []; max 5; strings 1–50 chars; se normalizan a lowercase
}
```

**Response 201:** `Ticket`

**Errores:**
| HTTP | error | Cuándo |
|:---:|---|---|
| 400 | `validation` | Body inválido |
| 422 | `inactive_user` | `asignado_a_id` apunta a usuario inactivo |

---

#### `GET /api/tickets/:id`

Obtiene un ticket por ID, incluyendo sus comentarios.  
**Requiere auth:** Sí

**Response 200:**
```typescript
Ticket & {
  comentarios: Comentario[]   // ordenados por creado_en ASC
}
```

**Errores:**
| HTTP | error | Cuándo |
|:---:|---|---|
| 404 | `not_found` | Ticket no existe |

---

#### `PATCH /api/tickets/:id`

Actualiza campos de un ticket activo. Implementa optimistic locking mediante `version`.  
**Requiere auth:** Sí  
**Permisos:** Admin puede editar cualquier ticket; Usuario solo puede editar los que creó. Solo Admin puede reasignar (`asignado_a_id`).

**Request body:**
```json
{
  "version": 3,                 // REQUERIDO siempre; número de versión actual del ticket
  "titulo": "string",           // opcional, 1–120 chars
  "descripcion": "string",      // opcional, nullable
  "estado": "en_progreso",      // opcional; enum: por_hacer | en_progreso | bloqueado | listo
  "prioridad": "alta",          // opcional; enum: alta | media | baja
  "asignado_a_id": "uuid",      // opcional, nullable; solo Admin; debe ser usuario activo
  "etiquetas": ["backend"]      // opcional; max 5; reemplaza etiquetas existentes
}
```

**Response 200:** `Ticket` — con `version` incrementada en 1.

**Errores:**
| HTTP | error | Cuándo |
|:---:|---|---|
| 400 | `validation` | Body inválido |
| 403 | `forbidden` | Usuario sin permiso para editar o reasignar |
| 403 | `archived` | El ticket está archivado (solo lectura) |
| 404 | `not_found` | Ticket no existe |
| 409 | `version_conflict` | `version` no coincide con la versión actual — otro usuario editó primero |
| 422 | `inactive_user` | `asignado_a_id` apunta a usuario inactivo |

---

#### `PATCH /api/tickets/:id/archive`

Archiva un ticket activo. Operación irreversible desde el cliente (solo Admin puede restaurar).  
**Requiere auth:** Sí  
**Permisos:** Admin puede archivar cualquier ticket; Usuario solo puede archivar los que creó.

**Request body:** Vacío `{}`

**Response 200:** `Ticket` — con `archived_at` seteado.

**Errores:**
| HTTP | error | Cuándo |
|:---:|---|---|
| 403 | `forbidden` | Usuario sin permiso para archivar este ticket |
| 404 | `not_found` | Ticket no existe |

---

## P1 — Comentarios, usuarios y restauración

> Funcionalidad principal del MVP. Bloqueante para HU-02, HU-03 y gestión de equipo.

---

### Comentarios

#### `GET /api/tickets/:ticketId/comments`

Lista todos los comentarios de un ticket.  
**Requiere auth:** Sí

**Response 200:** `Comentario[]` — ordenados por `creado_en` ASC.

**Errores:**
| HTTP | error | Cuándo |
|:---:|---|---|
| 404 | `not_found` | Ticket no existe (implícito vía filtrado) |

---

#### `POST /api/tickets/:ticketId/comments`

Añade un comentario a un ticket activo.  
**Requiere auth:** Sí  
**Restricción:** No se puede comentar en tickets archivados.

**Request body:**
```json
{
  "texto": "string"   // requerido, 1–5000 chars
}
```

**Response 201:** `Comentario`

**Errores:**
| HTTP | error | Cuándo |
|:---:|---|---|
| 400 | `validation` | Body inválido |
| 403 | `archived` | El ticket está archivado |
| 404 | `not_found` | Ticket no existe |

---

#### `DELETE /api/tickets/:ticketId/comments/:commentId`

Elimina un comentario.  
**Requiere auth:** Sí  
**Permisos:** Admin puede borrar cualquier comentario; Usuario solo puede borrar los suyos.

**Response 204:** Sin body.

**Errores:**
| HTTP | error | Cuándo |
|:---:|---|---|
| 403 | `forbidden` | Usuario intenta borrar comentario ajeno |
| 404 | `not_found` | Comentario no existe |

---

### Usuarios

#### `GET /api/users`

Lista todos los usuarios del sistema (activos e inactivos).  
**Requiere auth:** Sí  
**Uso:** Poblar selectores de asignación (el frontend filtra `activo === true` antes de mostrar).

**Response 200:** `Usuario[]` — ordenados alfabéticamente por `nombre`.  
El campo `password_hash` **nunca** se incluye en la respuesta.

---

#### `PATCH /api/tickets/:id/restore`

Restaura un ticket archivado al estado activo.  
**Requiere auth:** Sí  
**Permisos:** Solo Admin.

**Request body:** Vacío `{}`

**Response 200:** `Ticket` — con `archived_at: null`.

**Errores:**
| HTTP | error | Cuándo |
|:---:|---|---|
| 403 | `forbidden` | El usuario no es Admin |
| 404 | `not_found` | Ticket no existe |

---

## P2 — Administración y métricas

> Funcionalidad de gestión de equipo y dashboard. Solo Admin.

---

### Usuarios (admin)

#### `POST /api/users`

Crea un nuevo usuario.  
**Requiere auth:** Sí  
**Permisos:** Solo Admin.

**Request body:**
```json
{
  "nombre": "string",    // requerido, 2–100 chars
  "email": "string",     // requerido, email válido, único en el sistema
  "password": "string",  // requerido, min 8 chars; se almacena como bcrypt hash
  "rol": "usuario"       // opcional, default "usuario"; enum: admin | usuario
}
```

**Response 201:** `Usuario`

**Errores:**
| HTTP | error | Cuándo |
|:---:|---|---|
| 400 | `validation` | Body inválido |
| 403 | `forbidden` | El usuario no es Admin |
| 409 | `conflict` | El email ya está registrado |

---

#### `PATCH /api/users/:id`

Actualiza nombre, rol o estado activo/inactivo de un usuario.  
**Requiere auth:** Sí  
**Permisos:** Solo Admin.  
**Nota:** Al desactivar un usuario (`activo: false`) sus tickets asignados permanecen; se muestran con indicador "(inactivo)" en el tablero.

**Request body:**
```json
{
  "nombre": "string",    // opcional, 2–100 chars
  "rol": "admin",        // opcional; enum: admin | usuario
  "activo": false        // opcional; false = desactivar cuenta
}
```

**Response 200:** `Usuario`

**Errores:**
| HTTP | error | Cuándo |
|:---:|---|---|
| 400 | `validation` | Body inválido |
| 403 | `forbidden` | El usuario no es Admin |
| 404 | `not_found` | Usuario no existe |

---

### Métricas

#### `GET /api/metrics`

Devuelve métricas agregadas del mes solicitado.  
**Requiere auth:** Sí  
**Nota:** Los tickets archivados se excluyen de todas las métricas.

**Query params:**

| Param | Tipo | Descripción |
|---|---|---|
| `mes` | `number` (1–12) | Mes a consultar. Default: mes actual |
| `anio` | `number` | Año a consultar. Default: año actual |

**Response 200:**
```json
{
  "mes": 2,
  "anio": 2026,
  "tickets_creados": 7,
  "tickets_listos": 3,
  "distribucion_por_estado": [
    { "estado": "por_hacer",   "total": 2 },
    { "estado": "en_progreso", "total": 2 },
    { "estado": "bloqueado",   "total": 1 },
    { "estado": "listo",       "total": 3 }
  ],
  "tickets_listos_por_usuario": [
    {
      "usuario": { "id": "u-ana-002", "nombre": "Ana García", ... },
      "total": 2
    }
  ]
}
```

> `distribucion_por_estado` refleja el estado actual de **todos** los tickets activos (no solo los del mes). `tickets_creados` y `tickets_listos` son del período solicitado.

---

## Health check

#### `GET /api/health`

Verifica que el servidor está en línea.  
**Requiere auth:** No

**Response 200:**
```json
{ "ok": true }
```

---

## Resumen de endpoints

| # | Método | Ruta | Auth | Rol | Prioridad |
|:---:|---|---|:---:|---|:---:|
| 1 | POST | `/api/auth/login` | No | Todos | P0 |
| 2 | POST | `/api/auth/refresh` | No | Todos | P0 |
| 3 | POST | `/api/auth/logout` | Sí | Todos | P0 |
| 4 | GET | `/api/tickets` | Sí | Todos | P0 |
| 5 | POST | `/api/tickets` | Sí | Todos | P0 |
| 6 | GET | `/api/tickets/:id` | Sí | Todos | P0 |
| 7 | PATCH | `/api/tickets/:id` | Sí | Admin / Creador | P0 |
| 8 | PATCH | `/api/tickets/:id/archive` | Sí | Admin / Creador | P0 |
| 9 | GET | `/api/tickets/:ticketId/comments` | Sí | Todos | P1 |
| 10 | POST | `/api/tickets/:ticketId/comments` | Sí | Todos | P1 |
| 11 | DELETE | `/api/tickets/:ticketId/comments/:commentId` | Sí | Admin / Autor | P1 |
| 12 | GET | `/api/users` | Sí | Todos | P1 |
| 13 | PATCH | `/api/tickets/:id/restore` | Sí | Admin | P1 |
| 14 | POST | `/api/users` | Sí | Admin | P2 |
| 15 | PATCH | `/api/users/:id` | Sí | Admin | P2 |
| 16 | GET | `/api/metrics` | Sí | Todos | P2 |
| 17 | GET | `/api/health` | No | — | — |
