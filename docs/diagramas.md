# Diagramas Técnicos — Mini Jira v1.0

Generados a partir de `backend/src/app/api/**`, `docs/architecture-c4.mermaid`,
`docs/architecture-sequence.mermaid` y `docs/specs.md`.

---

## 1. Flujo de autenticación JWT

Basado en `backend/src/app/api/auth/login/route.ts` y `backend/src/app/api/auth/refresh/route.ts`:
rate limit por IP (10 intentos / 15 min), validación con `LoginSchema` (Zod), verificación de
`activo` y `bcrypt.compare`, emisión de `accessToken` (corto) + `refreshToken` (7 días, hash
persistido en `refresh_tokens`).

```mermaid
sequenceDiagram
    actor Usuario
    participant SPA as SPA React
    participant API as API REST (/api/auth/login)
    participant DB as PostgreSQL (Supabase)

    Usuario->>SPA: Ingresa email + password
    SPA->>API: POST /api/auth/login { email, password }

    API->>API: checkRateLimit(ip) — máx 10 intentos / 15 min

    alt Rate limit excedido
        API-->>SPA: 429 Too Many Requests (Retry-After: 900)
        SPA-->>Usuario: "Demasiados intentos. Espera 15 minutos."
    else Dentro del límite
        API->>API: Valida body con LoginSchema (Zod)

        alt Body inválido
            API-->>SPA: 400 validation
            SPA-->>Usuario: Muestra errores de campo
        else Body válido
            API->>DB: SELECT id, password_hash, rol, activo FROM usuarios WHERE email=?
            DB-->>API: Fila de usuario (o null)

            API->>API: Verifica user existe, activo=true y bcrypt.compare(password, hash)

            alt Credenciales inválidas o usuario inactivo
                API-->>SPA: 401 invalid_credentials
                SPA-->>Usuario: "Credenciales incorrectas"
            else Credenciales válidas
                API->>API: signAccess(userId, rol) — JWT de acceso
                API->>API: signRefresh(userId) — JWT de refresco
                API->>API: hashToken(refreshToken) — SHA-256 para almacenar

                API->>DB: INSERT INTO refresh_tokens (usuario_id, token_hash, expira_en, revocado=false)
                DB-->>API: OK

                API-->>SPA: 200 { accessToken, refreshToken, user }
                SPA->>SPA: Guarda accessToken en memoria (Zustand)
                SPA->>SPA: Guarda refreshToken en localStorage
                SPA-->>Usuario: Redirige a returnTo o /board
            end
        end
    end

    Note over SPA,API: Renovación posterior — POST /api/auth/refresh { refreshToken }<br/>Verifica firma, hash contra refresh_tokens (revocado/expira_en) y activo=true del usuario
```

---

## 2. Mover ticket entre columnas (lock pesimista + versión optimista + AuditLog)

Refleja el mecanismo real de dos capas de concurrencia implementado en el backend:

- **Lock pesimista** de edición vía `POST /api/tickets/:id/lock` y `DELETE /api/tickets/:id/lock`
  (`backend/src/app/api/tickets/[id]/lock/route.ts`), TTL de 5 minutos, liberado por el titular o un Admin.
- **Concurrencia optimista** en el `PATCH /api/tickets/:id` (`backend/src/app/api/tickets/[id]/route.ts`)
  mediante el campo `version`, resuelto de forma atómica por la función PL/pgSQL `patch_ticket_atomic`,
  la cual también inserta en `audit_log` cuando cambia `estado` (rollback automático si la inserción falla).

```mermaid
sequenceDiagram
    actor Usuario
    participant SPA as SPA React
    participant API as API REST
    participant DB as PostgreSQL (Supabase)

    Note over Usuario,DB: Precondición — ticket #42: estado="En progreso", version=5, archived_at=null

    Usuario->>SPA: Abre/arrastra la tarjeta del ticket #42
    SPA->>API: POST /api/tickets/42/lock (Bearer JWT)

    API->>DB: SELECT id, archived_at FROM tickets WHERE id=42
    DB-->>API: { archived_at: null }

    API->>DB: SELECT lock activo FROM ticket_locks WHERE ticket_id=42

    alt Lock activo de otro usuario (no expirado)
        DB-->>API: { locked_by: otroUsuario, expires_at: futuro }
        API-->>SPA: 409 { error:"locked", lock:{ locked_by, expires_at } }
        SPA-->>Usuario: "El ticket está bloqueado por otro usuario"
    else Sin lock, expirado, o lock propio
        DB-->>API: null o lock propio/expirado
        API->>DB: INSERT/UPDATE ticket_locks (locked_by=userId, expires_at=now+5min)
        DB-->>API: Lock creado/renovado
        API-->>SPA: 200/201 { locked_by, expires_at }

        SPA->>SPA: Optimistic update — mueve tarjeta a "Listo" en UI

        Note over SPA,API: PATCH /tickets/42 { estado:"Listo", version:5 }
        SPA->>API: PATCH /api/tickets/42

        API->>DB: SELECT version, archived_at, creado_por_id FROM tickets WHERE id=42
        DB-->>API: { version:5, archived_at:null, creado_por_id }

        API->>API: Verifica permiso (isAdmin OR isCreator) y version === 5

        alt Sin permiso o version_conflict
            API-->>SPA: 403 forbidden / 409 version_conflict
            SPA->>SPA: Revierte optimistic update
            SPA-->>Usuario: Error de permisos o "Otro usuario modificó este ticket..."
        else Permiso y versión OK
            API->>DB: CALL patch_ticket_atomic(id=42, expected_version=5, changes={estado:"Listo"}, usuario_id)
            Note right of DB: Transacción atómica:<br/>1) UPDATE tickets SET estado, version=version+1<br/>2) INSERT INTO audit_log (ticket_id, usuario_id, campo, valor_anterior, valor_nuevo)<br/>Si el INSERT falla, la transacción hace rollback completo
            DB-->>API: 'ok' (version=6)

            API->>DB: DELETE /api/tickets/42/lock (liberación tras guardar)
            DB-->>API: 204

            API-->>SPA: 200 { id:42, estado:"Listo", version:6 }
            SPA->>SPA: Confirma en Zustand + invalida caché TanStack Query
            SPA-->>Usuario: Tarjeta confirmada en columna "Listo"
        end
    end
```

---

## 3. Ciclo de vida de un ticket (con Pessimistic Lock)

Estados reales definidos en `docs/specs.md §2.3`: **Por hacer**, **En progreso**, **Bloqueado**,
**Listo** (4 columnas del tablero). Las transiciones son libres — cualquier estado puede moverse a
cualquier otro en V1 (sin flujo forzado) — pero toda edición pasa primero por la adquisición del
lock pesimista (`POST /tickets/:id/lock`) antes de intentar el cambio, y por su liberación
(`DELETE /tickets/:id/lock`) al finalizar o expirar el TTL de 5 minutos.

```mermaid
flowchart LR
    Start([Ticket creado]) --> TODO

    subgraph Estados del Tablero
        TODO["Por hacer"]
        PROGRESS["En progreso"]
        BLOCKED["Bloqueado"]
        DONE["Listo"]
    end

    TODO -- "solicita lock" --> LOCK1{"Pessimistic Lock<br/>disponible?"}
    PROGRESS -- "solicita lock" --> LOCK2{"Pessimistic Lock<br/>disponible?"}
    BLOCKED -- "solicita lock" --> LOCK3{"Pessimistic Lock<br/>disponible?"}
    DONE -- "solicita lock" --> LOCK4{"Pessimistic Lock<br/>disponible?"}

    LOCK1 -- "No — 409 locked" --> TODO
    LOCK2 -- "No — 409 locked" --> PROGRESS
    LOCK3 -- "No — 409 locked" --> BLOCKED
    LOCK4 -- "No — 409 locked" --> DONE

    LOCK1 -- "Sí — lock adquirido (TTL 5min)" --> PATCH1["PATCH estado + version"]
    LOCK2 -- "Sí — lock adquirido (TTL 5min)" --> PATCH2["PATCH estado + version"]
    LOCK3 -- "Sí — lock adquirido (TTL 5min)" --> PATCH3["PATCH estado + version"]
    LOCK4 -- "Sí — lock adquirido (TTL 5min)" --> PATCH4["PATCH estado + version"]

    PATCH1 --> RELEASE["Libera lock<br/>DELETE /tickets/:id/lock"]
    PATCH2 --> RELEASE
    PATCH3 --> RELEASE
    PATCH4 --> RELEASE

    RELEASE --> TODO
    RELEASE --> PROGRESS
    RELEASE --> BLOCKED
    RELEASE --> DONE
    RELEASE --> ARCHIVED(["Archivado<br/>(solo lectura, fuera del tablero)"])

    style LOCK1 fill:#f9f9ff,stroke:#737685
    style LOCK2 fill:#f9f9ff,stroke:#737685
    style LOCK3 fill:#f9f9ff,stroke:#737685
    style LOCK4 fill:#f9f9ff,stroke:#737685
```

> Nota: las transiciones entre `TODO`, `PROGRESS`, `BLOCKED` y `DONE` son todas-a-todas (sin flujo
> forzado, ver `specs.md` línea 81). El archivado (`archived_at != null`) es un estado terminal de
> solo lectura que saca al ticket del tablero principal y de las métricas del dashboard.
