# CLAUDE.md — Mini Jira v1.0

Reglas globales para todos los agentes y desarrolladores que trabajen en este repositorio.
**Estas reglas son no negociables. No las omitas ni las justifiques.**

---

## 1. Colores — Regla Estricta

> ⛔ **NUNCA inventes colores. NUNCA uses clases Tailwind de color genéricas (`blue-500`, `gray-200`, `red-400`, etc.) que no estén en esta lista.**

Todos los colores provienen de `stitch/DESIGN.md` y se registran en `tailwind.config.ts` bajo `theme.extend.colors`. Usa **exclusivamente** las siguientes clases:

| Token de diseño | Clase Tailwind | Hex |
|---|---|---|
| `surface` | `bg-surface` / `text-surface` | `#f9f9ff` |
| `surface-dim` | `bg-surface-dim` | `#cadbfc` |
| `surface-container-lowest` | `bg-surface-container-lowest` | `#ffffff` |
| `surface-container-low` | `bg-surface-container-low` | `#f0f3ff` |
| `surface-container` | `bg-surface-container` | `#e7eeff` |
| `surface-container-high` | `bg-surface-container-high` | `#dfe8ff` |
| `surface-container-highest` | `bg-surface-container-highest` | `#d6e3ff` |
| `on-surface` | `text-on-surface` | `#091c35` |
| `on-surface-variant` | `text-on-surface-variant` | `#434654` |
| `inverse-surface` | `bg-inverse-surface` | `#20314b` |
| `inverse-on-surface` | `text-inverse-on-surface` | `#ecf0ff` |
| `outline` | `border-outline` | `#737685` |
| `outline-variant` | `border-outline-variant` | `#c3c6d6` |
| `surface-tint` | `bg-surface-tint` | `#0c56d0` |
| `primary` | `bg-primary` / `text-primary` | `#003d9b` |
| `on-primary` | `text-on-primary` | `#ffffff` |
| `primary-container` | `bg-primary-container` | `#0052cc` |
| `on-primary-container` | `text-on-primary-container` | `#c4d2ff` |
| `inverse-primary` | `text-inverse-primary` | `#b2c5ff` |
| `secondary` | `bg-secondary` / `text-secondary` | `#5e4db9` |
| `on-secondary` | `text-on-secondary` | `#ffffff` |
| `secondary-container` | `bg-secondary-container` | `#9f8eff` |
| `on-secondary-container` | `text-on-secondary-container` | `#341d8d` |
| `tertiary` | `bg-tertiary` / `text-tertiary` | `#004e32` |
| `on-tertiary` | `text-on-tertiary` | `#ffffff` |
| `tertiary-container` | `bg-tertiary-container` | `#006844` |
| `on-tertiary-container` | `text-on-tertiary-container` | `#72e9af` |
| `error` | `bg-error` / `text-error` | `#ba1a1a` |
| `on-error` | `text-on-error` | `#ffffff` |
| `error-container` | `bg-error-container` | `#ffdad6` |
| `on-error-container` | `text-on-error-container` | `#93000a` |
| `background` | `bg-background` | `#f9f9ff` |
| `on-background` | `text-on-background` | `#091c35` |
| `surface-variant` | `bg-surface-variant` | `#d6e3ff` |

### Mapeo semántico obligatorio por componente

| Componente / Estado | Color a usar |
|---|---|
| Fondo global de la app | `bg-background` |
| Fondo de columnas Kanban | `bg-surface-container-low` |
| Tarjetas de ticket | `bg-surface-container-lowest` (blanco) |
| Borde de tarjeta | `border-outline-variant` |
| Texto principal | `text-on-surface` |
| Texto secundario / metadata | `text-on-surface-variant` |
| Botón primario (fondo) | `bg-primary-container` |
| Botón primario (texto) | `text-on-primary` |
| Input borde por defecto | `border-outline-variant` |
| Input borde en foco | `border-primary-container` (ring) |
| Badge estado "Por hacer" | `bg-surface-container-highest text-on-surface-variant` |
| Badge estado "En progreso" | `bg-surface-container-high text-primary` |
| Badge estado "Bloqueado" | `bg-secondary-container text-on-secondary-container` |
| Badge estado "Listo" | `bg-tertiary-container text-on-tertiary-container` |
| Error / destructivo | `bg-error text-on-error` |
| Error container / toasts de error | `bg-error-container text-on-error-container` |
| Badge prioridad Alta | `bg-error-container text-on-error-container` |
| Badge prioridad Media | `bg-secondary-container text-on-secondary-container` |
| Badge prioridad Baja | `bg-tertiary-container text-on-tertiary-container` |

---

## 2. Tipografía

Fuentes definidas en `stitch/DESIGN.md`. Configúralas en `tailwind.config.ts`:

```
Hanken Grotesk → headings (display-sm, headline-lg, headline-md)
Inter           → body, labels, titles funcionales
```

| Escala | Fuente | Tamaño | Weight | Uso |
|---|---|---|---|---|
| `display-sm` | Hanken Grotesk | 30px / lh 38px | 700 | Título de página principal |
| `headline-lg` | Hanken Grotesk | 24px / lh 32px | 600 | Encabezados de sección |
| `headline-md` | Hanken Grotesk | 20px / lh 28px | 600 | Títulos de modales |
| `title-lg` | Inter | 16px / lh 24px | 600 | Título de tarjeta de ticket |
| `title-md` | Inter | 14px / lh 20px | 600 | Subtítulos, nombres de columna |
| `body-lg` | Inter | 16px / lh 24px | 400 | Texto de descripción |
| `body-md` | Inter | 14px / lh 20px | 400 | Comentarios, metadata |
| `label-lg` | Inter | 12px / lh 16px | 600 | Encabezados de columna Kanban (UPPERCASE) |
| `label-md` | Inter | 11px / lh 16px | 500 | Etiquetas de campo de formulario |

Los encabezados de columna Kanban usan `label-lg` **en mayúsculas** (`uppercase tracking-wider`).

---

## 3. Espaciado y Bordes

Sistema de 4px definido en `stitch/DESIGN.md`. Usar exclusivamente:

| Token | Valor | Clase Tailwind |
|---|---|---|
| `xs` | 4px | `p-1` / `gap-1` |
| `sm` | 8px | `p-2` / `gap-2` |
| `md` | 16px | `p-4` / `gap-4` |
| `lg` | 24px | `p-6` / `gap-6` |
| `xl` | 32px | `p-8` / `gap-8` |
| `gutter` | 12px | `p-3` / `gap-3` |
| `margin-mobile` | 16px | `px-4` |
| `margin-desktop` | 32px | `px-8` |

**Radios permitidos:**

| Token | Valor | Clase Tailwind | Uso |
|---|---|---|---|
| `sm` | 2px | `rounded-sm` | Micro-elementos |
| `DEFAULT` | 4px | `rounded` | Botones, inputs, tarjetas |
| `md` | 6px | `rounded-md` | — |
| `lg` | 8px | `rounded-lg` | Modales, paneles |
| `xl` | 12px | `rounded-xl` | Badges de estado, avatares |
| `full` | 9999px | `rounded-full` | Avatares de usuario |

---

## 4. Elevación y Sombras

Según `stitch/DESIGN.md`:

| Nivel | Elemento | Estilo |
|---|---|---|
| Level 0 | Fondo global | `bg-background` (sin sombra) |
| Level 1 | Columnas Kanban / Sidebar | `bg-surface-container-low` sin sombra extra |
| Level 2 | Tarjetas de ticket | `bg-surface-container-lowest border border-outline-variant shadow-sm` |
| Level 3 | Tarjeta en arrastre (DnD) | `shadow-lg rotate-1` (sombra elevada + rotación 2°) |

---

## 5. Componentes — Reglas de Implementación

### Tarjeta de Ticket (TicketCard)
- Fondo: `bg-surface-container-lowest`
- Borde: `border border-outline-variant rounded`
- Padding interno: `p-4` (16px)
- Título: escala `title-md` (Inter 14px/600)
- Avatar usuario: circular, 24px (`w-6 h-6 rounded-full`)
- Ícono de prioridad: alineado a la izquierda; avatar a la derecha

### Botones
- **Primario**: `bg-primary-container text-on-primary rounded px-4 py-2` (hover: `opacity-90`)
- **Sutil / secundario**: `bg-transparent text-on-surface-variant rounded px-4 py-2 hover:bg-surface-container`
- **Destructivo**: `bg-error text-on-error rounded px-4 py-2`

### Inputs y Formularios
- Borde base: `border-2 border-outline-variant rounded`
- Foco: `focus:border-primary-container focus:ring-0 outline-none`
- Label: escala `label-md` (Inter 11px/500)

### Badges de Estado
Todos usan `rounded-xl text-label-lg px-2 py-0.5` con los colores del mapeo semántico de §1.

### Columnas Kanban
- Ancho fijo: 280px–320px en desktop
- Encabezado: `label-lg uppercase tracking-wider text-on-surface-variant`
- Botón "+" al final de la columna: borde punteado sutil (`border-dashed border-outline`)

### Avatares de Usuario
- En tarjeta: `w-6 h-6 rounded-full` (24px)
- En filtro del tablero: `w-8 h-8 rounded-full` (32px)

---

## 6. Layout y Responsive

- **Grid base**: 12 columnas, fluid.
- **Mobile**: elementos verticales; tablero Kanban con scroll horizontal.
- **Desktop**: columnas Kanban fijas (280px–320px); scroll horizontal si superan el viewport.
- **Márgenes**: `px-4` en mobile, `px-8` en desktop (tokens `margin-mobile` / `margin-desktop`).

---

## 7. Stack y Arquitectura

Definidos en `Specs a Proyecto Real/frontend-specs.md`. Resumen ejecutivo:

- **Monorepo**: Turborepo — `apps/web` (React 18 + TS) · `apps/api` (Node 20 + Express) · `packages/shared` (tipos TS + schemas Zod)
- **Routing**: React Router v6
- **Estado servidor**: TanStack Query v5 (caché, revalidación, optimistic updates)
- **Estado UI / Auth**: Zustand v4
- **Filtros del tablero**: URL query params (`useSearchParams`) — nunca en Zustand
- **DnD**: `@dnd-kit/core` + `@dnd-kit/sortable`
- **Formularios**: `react-hook-form` + `zod` (schemas en `packages/shared`)
- **Markdown**: `@uiw/react-md-editor` (edición) + `react-markdown` (lectura)
- **Gráficas**: Recharts
- **Auth**: JWT propio vía `POST /api/auth/login`; accessToken en memoria (Zustand); refreshToken en localStorage

---

## 8. Reglas de Negocio Críticas

Estas reglas **deben aplicarse tanto en frontend como en backend**. El backend es la fuente de verdad; el frontend las refleja en UI pero nunca las sustituye.

1. **Permisos**: Ver `specs.md §2.1`. Nunca ocultar un botón sin verificar el permiso real en la API.
2. **Bloqueo optimista**: Todo `PATCH` de ticket envía `{ version }`. Un `409` revierte el optimistic update y muestra: *"Otro usuario modificó este ticket mientras lo editabas. Recarga para ver los cambios."*
3. **Archivado = solo lectura**: Si `archived_at !== null`, todos los campos del ticket son read-only. Sin botón guardar.
4. **Tickets archivados**: No aparecen en el tablero principal ni en las métricas del dashboard.
5. **Selector de asignado**: Muestra únicamente usuarios con `activo = true`.
6. **Usuario inactivo asignado**: Se muestra con indicador visual "(inactivo)" en la tarjeta, sin eliminarlo.
7. **Etiquetas**: Máximo 5 por ticket. El input se deshabilita al llegar al límite.
8. **Título**: Requerido, mínimo 1 char, máximo 120. Validación en tiempo real.
9. **Archivado con confirmación**: Siempre mostrar modal de confirmación antes de ejecutar el archivado.
10. **Redirect post-login**: Redirigir a `returnTo` si existe en query params, o a `/board` por defecto.

---

## 9. Lo que Está Fuera de Scope (V1)

No implementar bajo ninguna circunstancia en V1:

- Modo oscuro
- SSO / login corporativo
- Preferencias de notificación por usuario
- Edición de comentarios
- Adjuntos / imágenes en tickets
- Subtareas o tickets anidados
- Múltiples tableros o proyectos
- API pública

Cualquier solicitud de estas features debe documentarse como backlog V2, no implementarse.

---

## 10. Calidad de Código

- **TypeScript estricto**: `strict: true` en todos los `tsconfig.json`.
- **Sin `any`**: Usar tipos reales. Si el tipo es desconocido, usar `unknown` y narrowing.
- **Schemas Zod en `packages/shared`**: Los schemas de validación se comparten entre frontend y backend. No duplicar validaciones.
- **Sin comentarios de código innecesarios**: Solo comentar el *por qué* cuando no sea obvio. No comentar el *qué*.
- **Commits**: Convencional Commits (`feat:`, `fix:`, `chore:`). Un commit por historia de usuario o fix atómico.
- **CI obligatorio**: Ningún PR se fusiona sin pasar lint + type-check + tests en GitHub Actions.
- **Browsers objetivo**: Chrome y Firefox actualizados. Sin IE ni Safari en V1.

---

*Fuentes de verdad: `specs.md` · `stitch/DESIGN.md` · `Specs a Proyecto Real/frontend-specs.md` · `backlog.md`*  
*Cualquier regla nueva debe añadirse aquí antes de implementarse.*
