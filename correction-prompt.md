# Prompt de Corrección de Seguridad — Mini Jira v1.0

Eres un agente de seguridad que corregirá vulnerabilidades en este proyecto. Aplica los cambios **en el orden listado** (mayor severidad primero). No modifiques lógica de negocio, no refactorices código no relacionado, no añadas features. Solo corrige lo indicado.

---

## [C-01] CRÍTICO — Eliminar fallbacks hardcodeados de secretos JWT

**Archivo:** `backend/src/lib/jwt.ts` · líneas 4–5

**Cambio requerido:** Reemplaza el operador `??` con un lanzamiento explícito de error si la variable de entorno no está definida.

```ts
// ANTES (inseguro):
const ACCESS_SECRET  = process.env['JWT_SECRET']         ?? 'dev-secret'
const REFRESH_SECRET = process.env['JWT_REFRESH_SECRET'] ?? 'dev-refresh-secret'

// DESPUÉS (seguro):
const ACCESS_SECRET = process.env['JWT_SECRET']
const REFRESH_SECRET = process.env['JWT_REFRESH_SECRET']
if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET environment variables are required')
}
```

**Verificación:** El servidor no debe arrancar si las variables no están definidas. Asegúrate de que `.example.env` ya las documenta (ya lo hace).

---

## [A-01] ALTO — Agregar rate limiting al endpoint de login

**Archivo:** `backend/src/app/api/auth/login/route.ts`

**Cambio requerido:** Implementa rate limiting basado en IP usando un Map en memoria con ventana deslizante de 15 minutos / máximo 10 intentos. Para producción real se prefiere Redis, pero en memoria es suficiente para V1.

Agrega este módulo al inicio de `route.ts`, antes de `export async function POST`:

```ts
// Rate limiting en memoria — max 10 intentos por IP en 15 min
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 10

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= MAX_ATTEMPTS) return false
  entry.count++
  return true
}
```

En la función `POST`, extrae la IP y verifica el rate limit **antes** de procesar el body:

```ts
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Demasiados intentos. Espera 15 minutos.' },
      { status: 429, headers: { 'Retry-After': '900' } }
    )
  }
  // ... resto del handler sin cambios
```

Añade `'rate_limited'` al tipo `ApiErrorCode` en `backend/src/lib/errors.ts` y su status HTTP 429.

---

## [A-02] ALTO — Invalidar access token en logout (blocklist en memoria / Redis)

**Archivo:** `backend/src/app/api/auth/logout/route.ts`

**Cambio requerido:** Agrega el JTI (o el hash del accessToken) a una blocklist para que el `auth-guard` lo rechace durante el tiempo restante de validez.

**Paso 1 — Agregar `jti` al payload del access token** en `backend/src/lib/jwt.ts`:

```ts
import { randomUUID } from 'crypto'

// En signAccess — agrega jti:
export function signAccess(userId: string, rol: string): string {
  return jwt.sign({ userId, rol, jti: randomUUID() }, ACCESS_SECRET, {
    expiresIn: '1h',
  } as jwt.SignOptions)
}

// Actualiza AccessPayload:
export type AccessPayload = { userId: string; rol: 'admin' | 'usuario'; jti: string }
```

**Paso 2 — Crear blocklist en `backend/src/lib/token-blocklist.ts`** (archivo nuevo):

```ts
// Blocklist en memoria para access tokens revocados (TTL = expiración del token)
const blocklist = new Map<string, number>() // jti → expiresAt (epoch ms)

export function revokeToken(jti: string, expiresAt: number) {
  blocklist.set(jti, expiresAt)
  // Limpiar entradas expiradas para evitar memory leak
  const now = Date.now()
  for (const [key, exp] of blocklist) {
    if (exp < now) blocklist.delete(key)
  }
}

export function isTokenRevoked(jti: string): boolean {
  const exp = blocklist.get(jti)
  if (exp === undefined) return false
  if (exp < Date.now()) { blocklist.delete(jti); return false }
  return true
}
```

**Paso 3 — Actualizar `auth-guard.ts`** para verificar la blocklist:

```ts
import { isTokenRevoked } from '@/lib/token-blocklist'

export function getAuth(req: NextRequest): AuthResult {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return { ok: false }
  try {
    const user = verifyAccess(header.slice(7))
    if (isTokenRevoked(user.jti)) return { ok: false }
    return { ok: true, user }
  } catch {
    return { ok: false }
  }
}
```

**Paso 4 — Actualizar `logout/route.ts`** para revocar el access token:

```ts
import { revokeToken } from '@/lib/token-blocklist'
import { verifyAccess } from '@/lib/jwt'

export async function POST(req: NextRequest) {
  const auth = getAuth(req)
  if (!auth.ok) return errResponse('unauthorized', 'Token inválido o ausente')

  // Revocar el access token actual
  const expiresAt = Date.now() + 60 * 60 * 1000 // 1h desde ahora (peor caso)
  revokeToken(auth.user.jti, expiresAt)

  // Resto igual (revocar refresh token si se envía)
  ...
}
```

---

## [A-03] ALTO — Sanitizar mensajes de error de Supabase antes de exponerlos

**Archivos:** `backend/src/app/api/tickets/route.ts` · línea 44 · `backend/src/app/api/audit/[ticketId]/route.ts` · línea 34

**Cambio requerido:** Reemplaza la exposición directa del error de Supabase por un mensaje genérico. Loguea el error real en el servidor.

```ts
// ANTES (inseguro):
if (error) return errResponse('validation', error.message)

// DESPUÉS (seguro):
if (error) {
  console.error('[supabase error]', error.message)
  return errResponse('validation', 'Error al procesar la solicitud')
}
```

Aplica el mismo patrón a **todos** los lugares donde se pase `error.message` directamente a `errResponse`. Busca en el proyecto con:
```bash
grep -rn "errResponse.*error\.message" backend/src/
```

---

## [A-04] ALTO — Proteger endpoints de documentación con autenticación de admin

**Archivos:** `backend/src/app/api/docs/route.ts` · `backend/src/app/api/docs/openapi.json/route.ts`

**Cambio requerido:** Agregar `getAuth` con verificación de rol `admin` en ambas rutas.

```ts
// En backend/src/app/api/docs/route.ts:
import { NextRequest } from 'next/server'
import { getAuth } from '@/lib/auth-guard'
import { errResponse } from '@/lib/errors'

export function GET(req: NextRequest) {
  const auth = getAuth(req)
  if (!auth.ok || auth.user.rol !== 'admin') {
    return errResponse('forbidden', 'Acceso restringido')
  }
  // ... resto igual
}

// Aplica el mismo patrón a openapi.json/route.ts
```

---

## [M-01] MEDIO — Restringir audit log a rol admin

**Archivo:** `backend/src/app/api/audit/[ticketId]/route.ts` · línea 14

**Cambio requerido:** Después de verificar `auth.ok`, agrega verificación de rol:

```ts
const auth = getAuth(req)
if (!auth.ok) return errResponse('unauthorized', 'Token inválido o ausente')
if (auth.user.rol !== 'admin') return errResponse('forbidden', 'Acceso restringido a administradores')
```

---

## [M-02] MEDIO — Agregar headers de seguridad HTTP en next.config.mjs

**Archivo:** `backend/next.config.mjs`

**Cambio requerido:** Añade headers de seguridad al array de `headers()`. Reemplaza la función `headers()` completa:

```js
async headers() {
  const securityHeaders = [
    { key: 'X-DNS-Prefetch-Control', value: 'off' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    {
      key: 'Content-Security-Policy',
      value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://unpkg.com",
        "style-src 'self' 'unsafe-inline' https://unpkg.com",
        "img-src 'self' data: https:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
      ].join('; '),
    },
  ]

  return [
    {
      source: '/api/:path*',
      headers: [...CORS_HEADERS, ...securityHeaders],
    },
  ]
},
```

**Nota:** `'unsafe-inline'` es necesario solo para la ruta `/api/docs` (Swagger). Si `/api/docs` queda protegida por autenticación admin (corrección A-04), el riesgo es aceptable. Para producción sin Swagger público, puedes quitar `'unsafe-inline'`.

---

## [M-03] MEDIO — Agregar SRI a los recursos CDN de Swagger UI

**Archivo:** `backend/src/app/api/docs/route.ts` · líneas 14 y 22

**Cambio requerido:** Genera los hashes SRI del bundle de swagger-ui-dist y agrégalos:

```bash
# Genera los hashes (ejecuta una vez para obtener los valores):
curl -s https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css | openssl dgst -sha384 -binary | openssl base64 -A
curl -s https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js | openssl dgst -sha384 -binary | openssl base64 -A
```

Reemplaza las etiquetas HTML con los hashes obtenidos:

```html
<link rel="stylesheet"
      href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css"
      integrity="sha384-<HASH_CSS_AQUÍ>"
      crossorigin="anonymous" />

<script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"
        integrity="sha384-<HASH_JS_AQUÍ>"
        crossorigin="anonymous"></script>
```

---

## [B-01] BAJO — Eliminar fallback de `FRONTEND_ORIGIN` o lanzar error

**Archivo:** `backend/next.config.mjs` · línea 1

```js
// ANTES:
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'

// DESPUÉS:
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN
if (!FRONTEND_ORIGIN) {
  throw new Error('FRONTEND_ORIGIN environment variable is required')
}
```

Actualiza `.example.env` para documentar `FRONTEND_ORIGIN` como variable requerida (renombrar de `FRONTEND_URL` a `FRONTEND_ORIGIN`).

---

## [B-02] BAJO — Reducir datos expuestos de usuario en comentarios y locks

**Archivos:** `backend/src/app/api/tickets/[id]/route.ts` · línea 43 · `backend/src/app/api/tickets/[id]/lock/route.ts` · líneas 62, 85

**Cambio requerido:** Limitar los campos del usuario a lo necesario para la UI:

```ts
// ANTES:
'autor:autor_id(id, nombre, email, rol, activo, creado_en, actualizado_en)'

// DESPUÉS (solo lo que necesita el frontend):
'autor:autor_id(id, nombre, email, rol, activo)'
```

Aplica el mismo cambio en el select de `lock/route.ts` para `locked_by` y en la consulta de `lockerRaw`.

---

## Orden de aplicación recomendado

1. **[C-01]** Secretos JWT — riesgo de compromiso total
2. **[A-01]** Rate limiting login — previene brute force activo
3. **[A-02]** Invalidar access token en logout
4. **[A-03]** Sanitizar errores de Supabase
5. **[A-04]** Proteger docs con autenticación
6. **[M-01]** Audit log solo para admins
7. **[M-02]** Headers de seguridad HTTP
8. **[M-03]** SRI en Swagger CDN
9. **[B-01]** Fallback FRONTEND_ORIGIN
10. **[B-02]** Reducir datos de usuario en responses

---

*Generado automáticamente a partir de `security-report.md`. No implementar correcciones sin revisar el reporte completo primero.*
