# PRD — Mini Jira (Herramienta Interna de Gestión de Tickets)

**Versión:** 1.0  
**Fecha:** 2026-06-03  
**Autor:** PM Senior (basado en kick-off del 24 de octubre)  
**Stakeholders:** Laura (PO), Marcos (Tech Lead), Sofía (Dev Junior), Roberto (PM)  
**Equipo objetivo:** 10 personas internas  
**Deadline objetivo:** 3 semanas desde inicio de desarrollo  

---

> **Nota de proceso:** Este PRD registra las decisiones tomadas en el kick-off y resuelve explícitamente los gaps identificados. Los ítems marcados con ⚠️ requieren validación de Laura o Roberto antes de comenzar la historia de usuario correspondiente.

---

## 1. Objetivo del Producto

Herramienta web interna que permita al equipo de 10 personas crear, gestionar y dar seguimiento a tickets de trabajo. Sustituye el uso de Jira (percibido como complejo y visualmente denso) con una interfaz ligera, estética moderna y curva de aprendizaje mínima.

---

## 2. In-Scope (V1 — 3 semanas)

### 2.1 Autenticación y Roles

- Login con email y contraseña propios de la aplicación (no SSO corporativo en V1).
- Dos roles únicos: **Admin** y **Usuario**.

**Matriz de permisos definitiva:**

| Acción | Usuario (propio ticket) | Usuario (ticket ajeno) | Admin |
|---|:---:|:---:|:---:|
| Ver todos los tickets | ✅ | ✅ | ✅ |
| Crear ticket | ✅ | — | ✅ |
| Editar título / descripción | ✅ | ❌ | ✅ |
| Cambiar estado | ✅ | ❌ | ✅ |
| Reasignar ticket | ❌ | ❌ | ✅ |
| Archivar ticket | ✅ | ❌ | ✅ |
| Restaurar ticket archivado | ❌ | ❌ | ✅ |
| Crear comentarios | ✅ | ✅ | ✅ |
| Borrar comentario propio | ✅ | — | ✅ |
| Borrar comentario ajeno | ❌ | ❌ | ✅ |
| Gestionar usuarios | ❌ | — | ✅ |

> ⚠️ **Pendiente de validación (PO):** ¿Un usuario asignado a un ticket que no creó puede cambiarle el estado?

### 2.2 Modelo de Ticket

**Campos obligatorios:**

| Campo | Tipo | Notas |
|---|---|---|
| `título` | texto corto (máx. 120 chars) | Requerido |
| `descripción` | texto largo (markdown) | Opcional |
| `estado` | enum | Ver estados §2.3 |
| `prioridad` | enum: Alta / Media / Baja | Por defecto: Media |
| `asignado_a` | usuario del sistema | Opcional en creación |
| `creado_por` | usuario del sistema | Auto |
| `fecha_creación` | timestamp | Auto |
| `fecha_actualización` | timestamp | Auto |
| `etiquetas` | lista de strings libres | Opcional, máx. 5 |

**Ciclo de vida del ticket:**
- El botón en UI se etiqueta **"Eliminar"** pero la acción es un **archivado lógico** (campo `archived_at`).
- Los tickets archivados no aparecen en el tablero principal; tienen vista separada accesible desde el menú.
- Los tickets archivados son de **solo lectura** una vez archivados.
- El conteo de métricas del dashboard **excluye** tickets archivados (solo cuenta tickets en estado "Listo" activos).
- Solo Admin puede restaurar un ticket archivado.

### 2.3 Estados del Tablero

**Cuatro estados** (compromiso entre la petición de 3 columnas de Laura y la necesidad técnica de Marcos):

1. **Por hacer**
2. **En progreso**
3. **Bloqueado** *(requerido por el equipo técnico para visibilidad de dependencias)*
4. **Listo**

> ⚠️ **Pendiente de validación (PO):** Se propone reemplazar el estado "Review" solicitado por Marcos por "Bloqueado", más genérico. Confirmar con Laura que 4 columnas es aceptable visualmente.

Transiciones permitidas: cualquier estado puede moverse a cualquier otro estado (sin flujo forzado en V1).

### 2.4 Filtros y Búsqueda

El tablero principal permite filtrar por:
- Estado (uno o varios)
- Prioridad (uno o varios)
- Asignado a (selector de usuario)
- Etiquetas (una o varias)
- Rango de fechas de creación

Barra de búsqueda de texto libre sobre `título` y `descripción`.

### 2.5 Comentarios

- Comentarios de texto plano (sin markdown en V1) en cada ticket.
- Campos: autor, texto, timestamp.
- Un usuario puede borrar sus propios comentarios; Admin puede borrar cualquiera.
- No hay edición de comentarios (se borra y se reescribe).

### 2.6 Notificaciones por Email

Triggers que generan un email al destinatario:

| Evento | Destinatario |
|---|---|
| Ticket asignado a ti | El usuario asignado |
| Alguien comenta en un ticket tuyo | El creador del ticket |
| Alguien te menciona con `@usuario` en un comentario | El usuario mencionado |
| El estado de un ticket asignado a ti cambia | El usuario asignado |

- Las notificaciones son solo de aviso (no de acción desde el email).
- Sin preferencias de notificación configurables en V1 (todos los triggers son activos por defecto).

### 2.7 Dashboard de Métricas

Pantalla independiente, visible por todos los roles, con:
- Tickets creados en el mes actual (total).
- Tickets en estado "Listo" en el mes actual (total y por usuario).
- Distribución de tickets activos por estado (gráfico de barras o dona).
- Filtro de mes/año para consultar histórico.

> Los tickets archivados se excluyen de todas las métricas.

### 2.8 Gestión de Usuarios (Admin)

- El Admin puede crear, desactivar y cambiar el rol de usuarios.
- Un usuario desactivado no puede iniciar sesión; sus tickets permanecen en el sistema tal cual (no se reasignan automáticamente).

> ⚠️ **Pendiente de validación (PO):** ¿Qué ocurre con los tickets asignados a un usuario cuando se desactiva? ¿Se dejan sin asignar o permanecen a su nombre con indicador "inactivo"?

### 2.9 Concurrencia — Estrategia de Edición Simultánea

Se implementa **bloqueo optimista**:

1. Cada ticket almacena un campo `version` (entero).
2. Al abrir un ticket para editar, el cliente recibe la versión actual.
3. Al guardar, el servidor compara la versión enviada con la almacenada.
4. Si coinciden: guarda y sube la versión. Si no coinciden: rechaza con error `409 Conflict`.
5. El usuario ve un aviso: *"Otro usuario modificó este ticket mientras lo editabas. Recarga para ver los cambios."*

Esta decisión es no negociable desde el punto de vista técnico para garantizar integridad de datos.

---

## 3. Out-of-Scope (V1)

Los siguientes ítems fueron discutidos pero quedan fuera del alcance de las 3 semanas:

| Ítem | Motivo de exclusión | Candidato para V2 |
|---|---|---|
| **Modo oscuro** | Mencionado al final sin consenso; añade complejidad en tokens de diseño | ✅ |
| **SSO / Login con cuentas corporativas** | Requiere integración con proveedor de identidad externo | ✅ |
| **Estado "Review"** | Absorbido por el estado "Bloqueado" en V1 | Evaluar post-lanzamiento |
| **Preferencias de notificación por usuario** | Complejidad de UI + backend desproporcionada para V1 | ✅ |
| **Edición de comentarios** | Baja prioridad; borrar y reescribir es suficiente | ✅ |
| **Tiempo estimado vs. tiempo real en ticket** | No fue mencionado por PO como requerimiento explícito | ✅ |
| **Adjuntos / imágenes en tickets** | No mencionado; alto coste de almacenamiento | Evaluar |
| **Subtareas o tickets anidados** | No mencionado; añade complejidad al modelo de datos | Evaluar |
| **API pública / integraciones externas** | Herramienta 100% interna | Evaluar |
| **Múltiples tableros o proyectos** | El equipo es de 10 personas; un tablero único es suficiente | ✅ |

---

## 4. Stack Tecnológico

### 4.1 Frontend

| Tecnología | Decisión | Justificación |
|---|---|---|
| Framework | **React 18** | Confirmado por Marcos en la reunión |
| Estilos | **Tailwind CSS** | Permite la estética "Apple" (blanco, sombras suaves, tipografía limpia) sin un sistema de diseño propio |
| Componentes UI | **shadcn/ui** | Sobre Tailwind; componentes accesibles y visualmente neutros, sin opinión de marca |
| Estado global | **Zustand** | Ligero; suficiente para el scope de V1 sin la complejidad de Redux |
| Fetching | **TanStack Query (React Query)** | Manejo de cache, revalidación y estados de carga/error estandarizados |
| Gráficas (dashboard) | **Recharts** | Ligero, declarativo, integración nativa con React |

### 4.2 Backend

| Tecnología | Decisión | Justificación |
|---|---|---|
| Runtime | **Node.js 20 LTS** | Confirmado por Marcos en la reunión |
| Framework | **Express.js** | Mínima configuración; adecuado para el scope |
| ORM | **Prisma** | Tipado fuerte, migraciones declarativas; responde la pregunta de Sofía sobre cambios de esquema de estados |
| Autenticación | **JWT + bcrypt** | Sin dependencias externas; tokens de corta duración (1h) + refresh token |
| Emails | **Nodemailer + SMTP** | Configuración contra servidor SMTP propio o Mailtrap en desarrollo; sin dependencia de servicios de pago en V1 |

### 4.3 Base de Datos

| Tecnología | Decisión | Justificación |
|---|---|---|
| Motor | **PostgreSQL 16** | Relacional confirmado por Marcos; JSONB disponible si se necesita para etiquetas |
| Hosting (desarrollo) | **Docker Compose** | Entorno reproducible para todo el equipo |
| Hosting (producción) | **A definir por Roberto** | Supabase o instancia en VPS son opciones viables en el rango de coste de una herramienta interna |

### 4.4 Infraestructura y Tooling

| Ítem | Decisión |
|---|---|
| Monorepo | **Turborepo** — `apps/web` (React) + `apps/api` (Node) + `packages/shared` (tipos TS comunes) |
| Lenguaje | **TypeScript** en frontend y backend |
| Tests | **Vitest** (unit) + **Supertest** (integración API); sin e2e en V1 por tiempo |
| CI | **GitHub Actions** — lint + type-check + tests en cada PR |
| Containerización | **Docker** para producción |

---

## 5. Riesgos y Dependencias Críticas

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Scope creep de Laura (email + dashboard ya lo ampliaron) | Alta | Alto | Congelar este PRD como contrato; cualquier nuevo ítem va a backlog V2 |
| 3 semanas insuficientes con el scope actual | Alta | Alto | Priorizar en este orden: auth → tickets CRUD → estados → comentarios → emails → dashboard |
| Falta de decisión sobre permisos bloquea el backend | Alta | Alto | Resolver los 2 ⚠️ antes del día 1 de desarrollo |
| Concurrencia ignorada genera pérdida de datos en producción | Media | Alto | Bloqueo optimista incluido en scope; no es negociable |
| Desacuerdo en número de estados (3 vs 5) | Media | Medio | PRD define 4; debe ser aprobado por Laura antes de iniciar |

---

## 6. Criterios de Aceptación para "Producción" (semana 3)

Un ticket está listo cuando:
1. Se puede crear, editar, archivar y ver en el tablero con los 4 estados.
2. Los permisos de la tabla §2.1 se cumplen y son verificados en el backend (no solo en el frontend).
3. Un cambio simultáneo genera el aviso de conflicto al segundo usuario.
4. El email de asignación llega al destinatario en menos de 2 minutos.
5. El dashboard muestra datos reales (no mockeados).
6. El sistema funciona en Chrome y Firefox actualizados (sin requisito de IE/Safari en V1).

---

*Este documento reemplaza los "acuerdos" informales del kick-off del 24 de octubre. Cualquier desviación debe ser aprobada por Roberto y reflejada en una nueva versión del PRD antes de implementarse.*
