# Frontend Specs — Mini Jira v1.0

**Versión:** 1.0  
**Fecha:** 2026-06-10  
**Referencia:** specs.md v1.0 · backlog.md · er_diagram.mermaid · architecture-c4.mermaid  
**Alcance:** SPA React en `apps/web` del monorepo Turborepo

---

## 1. Stack y Versiones

| Tecnología | Versión | Rol |
|---|---|---|
| React | **18.x** | Framework UI |
| TypeScript | **5.x** | Lenguaje (frontend + backend + shared) |
| Tailwind CSS | **3.x** | Estilos utilitarios |
| shadcn/ui | **latest compatible con Tailwind 3** | Componentes accesibles base |
| Zustand | **4.x** | Estado global de UI y auth |
| TanStack Query (React Query) | **5.x** | Estado de servidor, caché, revalidación |
| React Router | **6.x** | Routing SPA |
| @dnd-kit/core + @dnd-kit/sortable | **6.x** | Drag and drop en tablero Kanban |
| react-hook-form | **7.x** | Control de formularios |
| zod | **3.x** | Esquemas de validación (compartidos con backend en `packages/shared`) |
| @uiw/react-md-editor | **3.x** | Editor Markdown con preview en vivo |
| react-markdown | **9.x** | Renderizado de Markdown en modo lectura |
| Recharts | **2.x** | Gráficas del dashboard |
| Vite | **5.x** | Bundler y servidor de desarrollo |
| Vitest | **1.x** | Tests unitarios |

---

## 2. Dependencias del Proyecto (monorepo)

```
proyecto-mini-jira/          ← raíz Turborepo
├── apps/
│   ├── web/                 ← SPA React (este documento)
│   └── api/                 ← API REST Node.js + Express
└── packages/
    └── shared/              ← Tipos TypeScript + esquemas Zod compartidos
```

Las dependencias de `packages/shared` que consume el frontend:
- **Esquemas Zod**: `TicketCreateSchema`, `TicketUpdateSchema`, `CommentCreateSchema`, `LoginSchema`
- **Tipos TypeScript**: `Ticket`, `Usuario`, `Comentario`, `Etiqueta`, `Rol`, `EstadoTicket`, `PrioridadTicket`
- **Constantes**: valores de los enums (`ESTADOS`, `PRIORIDADES`)

---

## 3. Modelo de Datos (vista frontend)

Tipos derivados del esquema PostgreSQL (`er_diagram.mermaid`):

```typescript
// packages/shared/src/types.ts

type Rol = 'admin' | 'usuario';
type EstadoTicket = 'por_hacer' | 'en_progreso' | 'bloqueado' | 'listo';
type PrioridadTicket = 'alta' | 'media' | 'baja';

interface Usuario {
  id: string;           // UUID
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  creado_en: string;    // ISO 8601
  actualizado_en: string;
}

interface Ticket {
  id: number;           // BIGINT
  titulo: string;       // máx. 120 chars
  descripcion: string | null; // Markdown
  estado: EstadoTicket;
  prioridad: PrioridadTicket;
  version: number;      // bloqueo optimista
  archived_at: string | null; // null = activo
  creado_en: string;
  actualizado_en: string;
  creado_por: Usuario;
  asignado_a: Usuario | null;
  etiquetas: Etiqueta[];
}

interface Comentario {
  id: number;
  texto: string;        // texto plano, sin markdown
  creado_en: string;
  ticket_id: number;
  autor: Usuario;
}

interface Etiqueta {
  id: number;
  nombre: string;       // siempre en minúsculas
}

// Token de autenticación almacenado en Zustand
interface AuthUser {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  token: string;        // JWT de acceso
  refreshToken: string; // JWT de refresco
}
```

---

## 4. Autenticación

- **Estrategia**: API REST propia. El frontend llama a `POST /api/auth/login` y recibe `{ accessToken, refreshToken, user }`.
- **Almacenamiento de tokens**: `accessToken` en memoria (Zustand, no persiste en `localStorage`) para evitar XSS. `refreshToken` en `localStorage` para sobrevivir a un F5.
- **Persistencia de sesión**: Al cargar la app, si existe `refreshToken` válido en `localStorage`, se emite `POST /api/auth/refresh` para obtener un nuevo `accessToken` antes de renderizar rutas protegidas.
- **Expiración**: `accessToken` dura **1 hora**. TanStack Query reintenta automáticamente; si obtiene un `401`, el interceptor de `fetch` llama a `/refresh` una vez. Si el refresco falla, el usuario es redirigido a `/login`.
- **Cierre de sesión**: Llama a `POST /api/auth/logout` (invalida el `refreshToken` en el servidor) y limpia el estado de Zustand y `localStorage`.

---

## 5. Rutas de la SPA

| Ruta | Componente página | Acceso | Notas |
|---|---|---|---|
| `/login` | `LoginPage` | Público | Redirige a `/board` si ya está autenticado |
| `/board` | `BoardPage` | Autenticado | Tablero Kanban principal |
| `/archive` | `ArchivePage` | Autenticado | Tickets archivados, solo lectura |
| `/dashboard` | `DashboardPage` | Autenticado | Métricas y gráficas |
| `/admin/users` | `AdminUsersPage` | Admin únicamente | Gestión de usuarios |
| `*` | `NotFoundPage` | — | Redirige a `/board` si autenticado, a `/login` si no |

**Redirect de protección**: Una ruta protegida que el usuario intenta visitar sin sesión activa redirige a `/login?returnTo=<ruta-original>`. Tras login exitoso, se navega a `returnTo`.

**Filtros del tablero en URL** (`/board`):

```
/board?estado=en_progreso&estado=bloqueado&prioridad=alta&asignado_a=<uuid>&etiqueta=bug&q=texto
```

- Múltiples valores del mismo parámetro = OR dentro del criterio.
- Criterios distintos = AND entre ellos.
- Búsqueda de texto libre: parámetro `q`, aplica sobre `titulo` y `descripcion`.
- Se leen/escriben con `useSearchParams` de React Router v6.

---

## 6. Arquitectura de Componentes

### 6.1 Árbol general

```
AppLayout
├── Sidebar / Navbar
│   ├── Logo
│   ├── NavLink → /board
│   ├── NavLink → /archive
│   ├── NavLink → /dashboard
│   ├── NavLink → /admin/users  [solo Admin]
│   └── UserMenu (nombre, cerrar sesión)
└── <Outlet>  ← contenido de la ruta activa
```

### 6.2 BoardPage — Kanban

```
BoardPage
├── FilterBar
│   ├── SearchInput          (query param: q)
│   ├── StatusFilter         (multi-select, query param: estado)
│   ├── PriorityFilter       (multi-select, query param: prioridad)
│   ├── AssigneeFilter       (selector de usuario activo, query param: asignado_a)
│   ├── TagFilter            (query param: etiqueta)
│   ├── DateRangeFilter      (query params: fecha_desde, fecha_hasta)
│   └── ClearFiltersButton
├── KanbanBoard              (DndContext de @dnd-kit)
│   ├── KanbanColumn[por_hacer]
│   │   ├── ColumnHeader     (título + conteo de tarjetas visibles)
│   │   └── TicketCard[]     (SortableContext)
│   ├── KanbanColumn[en_progreso]
│   ├── KanbanColumn[bloqueado]
│   └── KanbanColumn[listo]
│       └── EmptyColumnState (si no hay tickets con los filtros activos)
├── DragOverlay              (snapshot visual al arrastrar)
├── TicketDetailModal        (se abre al clic en TicketCard)
│   ├── TicketHeader         (título, estado, prioridad, badges)
│   ├── MarkdownRenderer     (descripción en modo vista)
│   ├── TicketMeta           (creado por, asignado a, fechas, etiquetas)
│   ├── TicketActions        (editar, archivar — según permisos)
│   ├── CommentList
│   │   └── CommentItem[]    (texto, autor, fecha, botón borrar propio/admin)
│   └── CommentForm          (textarea + botón enviar)
└── CreateTicketButton → CreateTicketModal
    └── TicketForm
        ├── TitleInput       (react-hook-form, validación zod máx. 120)
        ├── MarkdownEditor   (@uiw/react-md-editor, campo descripción)
        ├── PrioritySelect   (Alta/Media/Baja, default: Media)
        ├── AssigneeSelect   (solo usuarios activos)
        ├── TagInput         (chips, máx. 5)
        └── SubmitButton
```

### 6.3 TicketCard (tarjeta del tablero)

Muestra:
- Título del ticket
- Badge de prioridad (color según nivel: rojo=Alta, amarillo=Media, verde=Baja)
- Avatar/nombre del asignado (con badge "(inactivo)" si `activo=false`)
- Lista de etiquetas (máx. 3 visibles + contador "+N")
- Indicador de número de comentarios

### 6.4 ArchivePage

```
ArchivePage
├── PageHeader ("Tickets Archivados")
└── TicketTable (lista, no tablero)
    └── TicketRow[]
        ├── Título, estado, prioridad, asignado a, fecha de archivado
        └── RestoreButton  [solo Admin]
```

### 6.5 DashboardPage

```
DashboardPage
├── MonthYearPicker          (filtro de mes/año para histórico)
├── MetricCard[tickets_creados_mes]
├── MetricCard[tickets_listos_mes]
├── TicketsByStatusChart     (Recharts: gráfico de dona o barras, distribución por estado)
└── TicketsByUserTable       (tickets en estado "Listo" por usuario, mes seleccionado)
```

### 6.6 AdminUsersPage

```
AdminUsersPage              [solo Admin]
├── CreateUserButton → CreateUserModal
│   └── UserForm (nombre, email, contraseña, rol)
└── UserTable
    └── UserRow[]
        ├── nombre, email, rol, estado (activo/inactivo)
        ├── ToggleActiveButton (activar/desactivar)
        └── ChangeRoleSelect   (Admin/Usuario)
```

---

## 7. Estado Global (Zustand)

### `authStore`

```typescript
interface AuthStore {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  clearAuth: () => void;
  isAdmin: () => boolean;
}
```

### `uiStore`

```typescript
interface UiStore {
  // Ticket actualmente abierto en el modal de detalle
  openTicketId: number | null;
  setOpenTicketId: (id: number | null) => void;
}
```

El estado de filtros **no** va en Zustand: se lee de los URL query params con `useSearchParams`.

---

## 8. Estado de Servidor (TanStack Query)

Query keys y responsabilidades:

| Query key | Datos | Invalidación |
|---|---|---|
| `['tickets', filtros]` | Tickets activos con filtros aplicados | Al crear/editar/archivar ticket |
| `['ticket', id]` | Detalle de un ticket (con comentarios) | Al editar, comentar, cambiar estado |
| `['tickets', 'archived']` | Tickets archivados | Al archivar/restaurar |
| `['users']` | Lista de usuarios (todos, para selector) | Al crear/activar/desactivar usuario |
| `['metrics', { mes, anio }]` | Datos del dashboard | Cambio de mes/año |

**Optimistic updates** (flujo del diagrama de secuencia):
1. Al soltar una tarjeta en otra columna, el estado local se actualiza inmediatamente en el store de TanStack Query (optimistic update).
2. Se emite `PATCH /api/tickets/:id` con `{ estado, version }`.
3. Si la respuesta es `200`: se confirma el estado y se invalida la query.
4. Si la respuesta es `403` o `409`: se revierte el optimistic update y se muestra el toast correspondiente.

---

## 9. Estructura de Carpetas (`apps/web/src/`)

```
src/
├── api/
│   ├── client.ts            # fetch wrapper con inyección de JWT y manejo de 401/refresh
│   ├── tickets.ts           # funciones CRUD de tickets + hooks TanStack Query
│   ├── users.ts             # funciones de usuarios + hooks
│   ├── comments.ts          # funciones de comentarios + hooks
│   └── metrics.ts           # funciones de métricas + hooks
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── UserMenu.tsx
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── PrivateRoute.tsx  # redirige a /login si no autenticado
│   │   └── AdminRoute.tsx    # redirige a /board si no es Admin
│   ├── kanban/
│   │   ├── KanbanBoard.tsx   # DndContext principal
│   │   ├── KanbanColumn.tsx
│   │   ├── TicketCard.tsx    # SortableItem
│   │   └── DragOverlay.tsx
│   ├── tickets/
│   │   ├── TicketDetailModal.tsx
│   │   ├── TicketForm.tsx
│   │   ├── TicketHeader.tsx
│   │   ├── TicketMeta.tsx
│   │   ├── TicketActions.tsx
│   │   ├── TicketStatusBadge.tsx
│   │   ├── TicketPriorityBadge.tsx
│   │   └── TagInput.tsx
│   ├── markdown/
│   │   ├── MarkdownEditor.tsx  # wrapper @uiw/react-md-editor
│   │   └── MarkdownRenderer.tsx # wrapper react-markdown
│   ├── comments/
│   │   ├── CommentList.tsx
│   │   ├── CommentItem.tsx
│   │   └── CommentForm.tsx
│   ├── filters/
│   │   ├── FilterBar.tsx
│   │   ├── SearchInput.tsx
│   │   ├── StatusFilter.tsx
│   │   ├── PriorityFilter.tsx
│   │   ├── AssigneeFilter.tsx
│   │   ├── TagFilter.tsx
│   │   └── DateRangeFilter.tsx
│   ├── dashboard/
│   │   ├── MetricCard.tsx
│   │   ├── TicketsByStatusChart.tsx
│   │   ├── TicketsByUserTable.tsx
│   │   └── MonthYearPicker.tsx
│   ├── users/
│   │   ├── UserTable.tsx
│   │   ├── UserRow.tsx
│   │   └── UserForm.tsx
│   └── ui/                  # re-exports y extensiones de shadcn/ui
│       ├── Button.tsx
│       ├── Modal.tsx
│       ├── Badge.tsx
│       ├── Toast.tsx
│       └── ...
├── pages/
│   ├── LoginPage.tsx
│   ├── BoardPage.tsx
│   ├── ArchivePage.tsx
│   ├── DashboardPage.tsx
│   ├── AdminUsersPage.tsx
│   └── NotFoundPage.tsx
├── store/
│   ├── authStore.ts
│   └── uiStore.ts
├── hooks/
│   ├── useAuth.ts           # accede a authStore + helpers de permisos
│   ├── useTicketPermissions.ts  # dado un ticket, retorna qué puede hacer el usuario actual
│   └── useBoardFilters.ts   # lee/escribe filtros en useSearchParams
├── lib/
│   ├── queryClient.ts       # instancia de QueryClient con config global
│   ├── router.tsx           # definición de rutas React Router v6
│   └── utils.ts             # formateo de fechas, helpers de clases CSS
├── constants/
│   └── index.ts             # labels en español de estados/prioridades, colores de badges
├── main.tsx                 # punto de entrada: QueryClientProvider + RouterProvider
└── vite-env.d.ts
```

---

## 10. Reglas de Negocio (Frontend)

### Autenticación y Sesión
1. Un usuario no autenticado que accede a cualquier ruta protegida es redirigido a `/login?returnTo=<ruta>`.
2. Tras login exitoso, se navega a `returnTo` si existe, o a `/board` por defecto.
3. Un usuario autenticado que accede a `/login` es redirigido automáticamente a `/board`.
4. El interceptor de `fetch` refresca el `accessToken` de forma transparente una vez ante un `401`. Si el refresco también falla, se limpia el auth y se redirige a `/login`.

### Permisos en la UI (HU-01 / specs.md §2.1)
5. Los botones/acciones que el usuario no puede ejecutar **se ocultan** (no solo deshabilitan), excepto en el tablero donde la tarjeta es visible pero sin opción de edición.
6. El hook `useTicketPermissions(ticket)` centraliza la lógica: retorna `{ canEdit, canChangeStatus, canArchive, canReassign }` según el rol y si es el creador.
7. El selector "Asignado a" solo muestra usuarios con `activo = true` en el momento de la consulta.
8. Los usuarios asignados con `activo = false` se muestran en la tarjeta con el nombre tachado o un badge "(inactivo)".

### Tablero Kanban y Drag and Drop
9. El DnD usa `@dnd-kit`. Al soltar una tarjeta en otra columna se aplica un **optimistic update** inmediato antes de confirmar con la API.
10. Ante un `403 Forbidden`: se revierte el optimistic update y se muestra un toast de error de permisos.
11. Ante un `409 Conflict`: se revierte y se muestra el toast: *"Otro usuario modificó este ticket mientras lo editabas. Recarga para ver los cambios."*
12. El conteo de tickets en el encabezado de cada columna refleja solo los tickets visibles con los filtros activos.
13. Si una combinación de filtros no arroja resultados, se muestra un `EmptyState` con mensaje y botón "Limpiar filtros".

### Formulario de Ticket
14. El campo `titulo` es requerido, mínimo 1 carácter, máximo 120. Validación en tiempo real con react-hook-form + zod.
15. El campo `descripcion` usa `@uiw/react-md-editor` con tab de "Editar" y "Preview". Opcional.
16. El campo `etiquetas` no acepta más de 5 entradas; al llegar al límite el input se deshabilita.
17. El campo `prioridad` tiene como valor por defecto "Media".
18. El botón "Guardar" se deshabilita mientras la mutación de TanStack Query está en estado `pending`.

### Archivado y Tickets de Solo Lectura (EC-01)
19. El botón de archivado se etiqueta **"Eliminar"** en la UI, pero la acción es un archivado lógico.
20. Antes de ejecutar el archivado, se muestra un modal de confirmación.
21. Si el ticket tiene `archived_at !== null`, todos los campos del detalle son de solo lectura (inputs deshabilitados). El botón "Guardar" no se renderiza.
22. Si al intentar guardar la API devuelve que el ticket está archivado (error `409` con causa `archived`), se muestra el mensaje: *"Este ticket fue archivado y es de solo lectura"*.

### Comentarios
23. El campo de comentario es texto plano (no markdown). Máximo a definir por backend.
24. El autor de un comentario puede borrarlo (botón visible solo al autor). El Admin puede borrar cualquier comentario.
25. No hay edición de comentarios. El flujo es: borrar y reescribir.

### Dashboard
26. Todas las métricas excluyen tickets con `archived_at !== null`.
27. El `MonthYearPicker` permite consultar meses anteriores. Por defecto carga el mes en curso.

### Notificaciones Email (transparente para el frontend)
28. El frontend **no gestiona** el envío de emails. Solo dispara las acciones (asignar, cambiar estado, comentar) que generan notificaciones en el backend.

---

## 11. Diseño Visual

- **Estética**: "Apple" — fondo blanco, tipografía limpia (sans-serif del sistema o Inter), sombras suaves (`shadow-sm`), bordes redondeados (`rounded-lg`).
- **Paleta base**: blanco (`#FFFFFF`), gris muy claro para fondos de columna (`#F5F5F7`), gris medio para texto secundario, acento azul para acciones primarias (color primario de shadcn/ui).
- **Prioridades** (badges en las tarjetas):
  - Alta → rojo (`bg-red-100 text-red-700`)
  - Media → amarillo/ámbar (`bg-amber-100 text-amber-700`)
  - Baja → verde (`bg-green-100 text-green-700`)
- **Estados** (encabezados de columna):
  - Por hacer → gris
  - En progreso → azul
  - Bloqueado → naranja
  - Listo → verde
- **Modo oscuro**: fuera de scope en V1 (ver specs.md §3).
- **Compatibilidad de navegadores**: Chrome y Firefox actualizados. Sin IE/Safari requerido en V1.

---

## 12. Variables de Entorno (`apps/web/.env`)

```
VITE_API_BASE_URL=http://localhost:3001/api
```

En producción: URL de la API desplegada. El frontend nunca accede directamente a PostgreSQL.

---

*Este documento debe aprobarse antes de iniciar la implementación. Cualquier desviación debe reflejarse en una nueva versión de este archivo.*
