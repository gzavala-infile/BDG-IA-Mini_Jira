# Reporte de Auditoría de Seguridad — Mini Jira v1.0

**Fecha:** 2026-06-24  
**Auditor:** Claude (OWASP Top 10 · 2021)  
**Alcance:** `backend/src/app/api/**`, `backend/src/lib/supabase.ts`, `backend/next.config.mjs`

---

## Resumen Ejecutivo

| Severidad | Cantidad |
|-----------|----------|
| CRÍTICO   | 2        |
| ALTO      | 4        |
| MEDIO     | 3        |
| BAJO      | 3        |
| **Total** | **12**   |

---

## CRÍTICO

---

### [C-01] Secretos JWT con fallback hardcodeado en código fuente

**Categoría OWASP:** A02 — Cryptographic Failures  
**Archivo:** `backend/src/lib/jwt.ts` · líneas 4–5

**Evidencia:**
```ts
const ACCESS_SECRET  = process.env['JWT_SECRET']         ?? 'dev-secret'
const REFRESH_SECRET = process.env['JWT_REFRESH_SECRET'] ?? 'dev-refresh-secret'
```

**Impacto real:**  
Si `JWT_SECRET` o `JWT_REFRESH_SECRET` no están definidas en el entorno de producción (p. ej., un despliegue incompleto, un contenedor sin su `.env`), el servidor firmará y verificará tokens con los strings públicamente conocidos `"dev-secret"` / `"dev-refresh-secret"`. Cualquier atacante puede forjar un JWT válido como `admin` y obtener acceso total a todos los endpoints sin credenciales. Este vector es explotable en segundos con herramientas como `jwt.io`.

---

### [C-02] Cliente Supabase con `service_role` key — sin fallback de RLS en caso de bug de autorización

**Categoría OWASP:** A01 — Broken Access Control  
**Archivo:** `backend/src/lib/supabase.ts` · líneas 11–16

**Evidencia:**
```ts
// Singleton con service_role key — bypasa RLS. Solo usar en server-side.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
```

**Impacto real:**  
El cliente único bypasa completamente Row Level Security de Supabase. Esto es arquitectónicamente correcto para un backend que gestiona su propia autorización, **pero crea un único punto de falla**: cualquier bug en `getAuth` o en la lógica de permisos resulta en acceso irrestricto a toda la base de datos. No existe una segunda capa de defensa (defensa en profundidad). Si un futuro desarrollador reutiliza este cliente en una ruta sin `getAuth`, la exposición es total e inmediata.

---

## ALTO

---

### [A-01] Sin rate limiting en el endpoint de login — brute force irrestricto

**Categoría OWASP:** A07 — Identification and Authentication Failures  
**Archivo:** `backend/src/app/api/auth/login/route.ts` · líneas 11–53

**Evidencia:**
```ts
export async function POST(req: NextRequest) {
  // No hay rate limiting, throttle, ni bloqueo por IP/cuenta
  const parsed = LoginSchema.safeParse(body)
  ...
  if (!user || !user.activo || !(await bcrypt.compare(password, user.password_hash))) {
    return errResponse('invalid_credentials', 'Credenciales incorrectas')
  }
```

**Impacto real:**  
Un atacante puede enviar miles de peticiones por segundo para realizar un ataque de diccionario o brute force sobre contraseñas. `bcrypt.compare` ralentiza cada intento individualmente (~100ms), pero una botnet distribuida puede paralelizar la carga. El endpoint no bloquea IPs, no introduce retrasos progresivos ni devuelve 429. Las cuentas con contraseñas débiles son comprometibles en minutos.

---

### [A-02] Access token no se invalida en logout (ventana de 1 hora post-logout)

**Categoría OWASP:** A07 — Identification and Authentication Failures  
**Archivo:** `backend/src/app/api/auth/logout/route.ts` · líneas 21–27

**Evidencia:**
```ts
const { refreshToken } = body as { refreshToken?: string }
if (refreshToken) {
  const tokenHash = hashToken(refreshToken)
  await supabase.from('refresh_tokens').update({ revocado: true }).eq('token_hash', tokenHash)
}
// El accessToken nunca se invalida
```

**Impacto real:**  
Al hacer logout, únicamente se revoca el refresh token en base de datos. El access token (JWT) permanece criptográficamente válido hasta su expiración (`1h`). Si un atacante roba el access token de un usuario que ya hizo logout (p. ej., via XSS, log de proxy, etc.), puede seguir autenticándose durante hasta 60 minutos sin posibilidad de revocación.

---

### [A-03] Mensajes de error internos de Supabase expuestos al cliente

**Categoría OWASP:** A09 — Security Logging and Monitoring Failures  
**Archivos:** `backend/src/app/api/tickets/route.ts` · línea 44 · `backend/src/app/api/audit/[ticketId]/route.ts` · línea 34

**Evidencia:**
```ts
// tickets/route.ts:44
if (error) return errResponse('validation', error.message)

// audit/[ticketId]/route.ts:34
if (error) return errResponse('validation', error.message)
```

**Impacto real:**  
Los mensajes de error de PostgREST/Supabase pueden revelar nombres de tablas, columnas, tipos de datos, violaciones de constraints y en algunos casos fragmentos de queries SQL. Esta información facilita la enumeración del esquema y el diseño de ataques dirigidos.

---

### [A-04] Endpoint de documentación OpenAPI expuesto sin autenticación

**Categoría OWASP:** A05 — Security Misconfiguration  
**Archivos:** `backend/src/app/api/docs/route.ts` y `backend/src/app/api/docs/openapi.json/route.ts`

**Evidencia:**
```ts
// docs/route.ts — sin getAuth(), accesible para cualquiera
export function GET() {
  const html = `...` // Swagger UI completo
  return new NextResponse(html, ...)
}
```

**Impacto real:**  
Cualquier persona (sin autenticarse) puede acceder a `/api/docs` y obtener la especificación OpenAPI completa: todos los endpoints, schemas de request/response, tipos de errores y modelos de datos. Esto actúa como un mapa de ataque que acelera cualquier exploración maliciosa. En entornos de producción esta documentación debe estar protegida o eliminada.

---

## MEDIO

---

### [M-01] Audit log accesible para cualquier usuario autenticado (sin restricción de rol)

**Categoría OWASP:** A01 — Broken Access Control  
**Archivo:** `backend/src/app/api/audit/[ticketId]/route.ts` · líneas 12–15

**Evidencia:**
```ts
export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = getAuth(req)
  if (!auth.ok) return errResponse('unauthorized', 'Token inválido o ausente')
  // No hay verificación de rol — cualquier usuario puede ver el historial de cualquier ticket
```

**Impacto real:**  
Cualquier usuario con rol `usuario` puede consultar el historial completo de cambios de cualquier ticket, incluyendo quién lo modificó, qué campos cambió, y los valores anteriores y nuevos. Esta información puede revelar patrones de trabajo, enumeración de usuarios activos y datos sensibles contenidos en descripciones.

---

### [M-02] Sin headers de seguridad HTTP (CSP, HSTS, X-Frame-Options, etc.)

**Categoría OWASP:** A05 — Security Misconfiguration  
**Archivo:** `backend/next.config.mjs` · líneas 3–8

**Evidencia:**
```js
const CORS_HEADERS = [
  { key: 'Access-Control-Allow-Origin', value: FRONTEND_ORIGIN },
  { key: 'Access-Control-Allow-Methods', value: '...' },
  { key: 'Access-Control-Allow-Headers', value: '...' },
  { key: 'Access-Control-Allow-Credentials', value: 'true' },
]
// Faltan: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options,
//         Strict-Transport-Security, Referrer-Policy, Permissions-Policy
```

**Impacto real:**  
Sin `X-Content-Type-Options: nosniff`, navegadores pueden ejecutar respuestas como scripts. Sin `X-Frame-Options: DENY`, la app es vulnerable a clickjacking. Sin `Content-Security-Policy`, un XSS puede cargar scripts externos arbitrarios. Sin `Strict-Transport-Security`, el tráfico puede ser downgraded a HTTP.

---

### [M-03] Scripts de Swagger UI cargados desde CDN sin Subresource Integrity (SRI)

**Categoría OWASP:** A08 — Software and Data Integrity Failures  
**Archivo:** `backend/src/app/api/docs/route.ts` · líneas 14 y 22

**Evidencia:**
```html
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
<script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
```

**Impacto real:**  
Si `unpkg.com` es comprometido (supply chain attack) o el paquete `swagger-ui-dist@5.17.14` es alterado, el script malicioso se ejecutará en el navegador de cualquier desarrollador que acceda a la documentación con plenos privilegios. Sin hashes SRI (`integrity="sha384-..."`), el navegador no puede detectar la manipulación.

---

## BAJO

---

### [B-01] `FRONTEND_ORIGIN` con fallback a `localhost` — riesgo en configuración incorrecta de producción

**Categoría OWASP:** A05 — Security Misconfiguration  
**Archivo:** `backend/next.config.mjs` · línea 1

**Evidencia:**
```js
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'
```

**Impacto real:**  
Si `FRONTEND_ORIGIN` no está definida en producción, el servidor aceptará requests CORS desde `http://localhost:5173` con `Access-Control-Allow-Credentials: true`. Si un atacante logra ejecutar código desde ese origen (p. ej., app maliciosa corriendo localmente en la máquina de la víctima), podría hacer requests autenticados. El riesgo es bajo pero no nulo en escenarios específicos (pivot de red local, SSRF).

---

### [B-02] Datos sensibles del usuario expuestos innecesariamente en comentarios y locks

**Categoría OWASP:** A04 — Insecure Design  
**Archivos:** `backend/src/app/api/tickets/[id]/route.ts` · línea 43 · `backend/src/app/api/tickets/[id]/lock/route.ts` · líneas 62, 85

**Evidencia:**
```ts
// Comentarios — incluye `activo`, `creado_en`, `actualizado_en` del autor
'autor:autor_id(id, nombre, email, rol, activo, creado_en, actualizado_en)'

// Locks — ídem para el titular del lock
'usuario:locked_by(id, nombre, email, rol, activo, creado_en, actualizado_en)'
```

**Impacto real:**  
Los campos `activo`, `creado_en` y `actualizado_en` de los usuarios no son necesarios en el contexto de comentarios o locks. Exponen información de auditoría interna que podría usarse para enumerar la actividad de usuarios (p. ej., detectar cuándo fue creada una cuenta, si está activa o inactiva).

---

### [B-03] Health check endpoint sin autenticación expone confirmación de existencia del servicio

**Categoría OWASP:** A05 — Security Misconfiguration  
**Archivo:** `backend/src/app/api/health/route.ts`

**Evidencia:**
```ts
export function GET() {
  return NextResponse.json({ ok: true })
}
```

**Impacto real:**  
El endpoint `/api/health` responde `{ ok: true }` sin autenticación, confirmando a cualquier escáner que el servicio está activo y respondiendo. Aunque esto es común y a menudo intencional para load balancers, en ausencia de WAF puede facilitar la enumeración de infraestructura. El riesgo es mínimo pero debe ser una decisión deliberada.

---

## Hallazgos No Aplicables (Verificados)

| Control | Estado |
|---------|--------|
| SQL Injection | ✅ No vulnerable — Supabase usa queries parametrizadas; el filtro `ilike` escapa `%` y `_` (línea 39 tickets/route.ts) |
| Password en respuesta | ✅ `password_hash` excluido explícitamente en todos los selects y `UsuarioPublico` type |
| IDOR en tickets | ✅ Verificación de existencia antes de cada operación |
| Optimistic locking | ✅ Implementado con `version` y función RPC atómica |
| Archived = read-only | ✅ Verificado en PATCH antes de procesar cambios |
| Refresh token rotation | ⚠️ Parcial — se revoca en logout pero no se rota automáticamente en cada uso (refresh endpoint no invalida el token anterior) |
