# Plan de Pruebas — Mini Jira MVP

**Rol:** QA Lead Senior  
**Fecha:** 2026-06-03  
**Versión:** 1.0  
**Referencias:** [specs.md](specs.md) · [prd_hu.md](prd_hu.md)  
**Cobertura:** HU-01, HU-02, HU-03, EC-01, EC-02 (23 escenarios Gherkin)

---

## 1. Alcance y Objetivos

### 1.1 En alcance
- Verificar que cada escenario Gherkin del backlog se cumple en backend y, donde aplique, en frontend.
- Garantizar que los permisos de la matriz (§2.1 del PRD) son **forzados en el servidor**, no solo ocultados en la UI.
- Validar la estrategia de bloqueo optimista (§2.9) bajo condiciones de escritura simultánea.
- Confirmar que los edge cases EC-01 y EC-02 tienen manejo explícito y no producen estados inconsistentes en base de datos.

### 1.2 Fuera de alcance (V1)
- Pruebas end-to-end automatizadas (Playwright/Cypress) — no están en el stack definido para V1.
- Pruebas de carga y rendimiento.
- Pruebas de compatibilidad en Safari e IE (PRD §6 solo exige Chrome y Firefox).
- Entrega real de emails en CI (se valida el trigger, no el SMTP de producción).

---

## 2. Estrategia de Pruebas

La estrategia sigue la pirámide de testing ajustada a las restricciones del PRD:

```
        [ Manual ]          ← UI, flujos de sesión, render visual
      [ Integration ]       ← Supertest sobre Express; base de datos real (test DB)
    [     Unit      ]       ← Vitest; lógica de permisos, validaciones, utilidades
```

### Principios
1. **Backend primero.** Todo criterio de aceptación que involucre permisos o datos se prueba primero a nivel de API (Supertest). La UI es una segunda línea, no la única.
2. **Base de datos real en integración.** Sin mocks de Prisma. Se usa una instancia PostgreSQL de test (Docker Compose) que se resetea antes de cada suite.
3. **Concurrencia por peticiones paralelas.** Los escenarios de conflicto (HU-02, EC-01) se simulan con `Promise.all` sobre dos peticiones Supertest simultáneas contra el mismo recurso.
4. **Emails con Nodemailer en modo test.** Se configura un transporte `jsonTransport` en entorno de test; las pruebas afirman que el trigger se disparó y que el destinatario correcto fue resuelto. La entrega real se valida manualmente contra Mailtrap en staging.

---

## 3. Herramientas y Entorno

| Capa | Herramienta | Entorno |
|---|---|---|
| Unit | **Vitest** | Local + CI |
| Integración API | **Supertest** sobre Express | Local + CI (Docker Compose) |
| Base de datos test | **PostgreSQL 16** (contenedor efímero) | Local + CI |
| Emails | **Nodemailer jsonTransport** | Local + CI |
| Emails staging | **Mailtrap** | Manual |
| UI / flujos de sesión | **Manual** (Chrome + Firefox) | Local / staging |
| CI | **GitHub Actions** | PR y merge a main |

---

## 4. Criterios de Entrada y Salida

### Entrada (para comenzar a ejecutar)
- [ ] Base de datos de test inicializada con migraciones Prisma aplicadas.
- [ ] Variables de entorno de test documentadas en `.env.test.example`.
- [ ] Suite de Vitest + Supertest ejecuta sin errores en rama `main`.
- [ ] Los 3 ⚠️ del PRD resueltos por Laura/Roberto (permisos de usuario asignado, 4 columnas, usuario desactivado con tickets).

### Salida (criterio de "listo para producción")
- [ ] 100 % de escenarios P1 pasan en CI.
- [ ] 100 % de escenarios P2 pasan en CI o tienen defecto registrado con workaround documentado.
- [ ] Cero defectos abiertos de severidad Crítica o Alta sin plan de resolución.
- [ ] Prueba manual de flujo completo ejecutada en Chrome y Firefox por al menos un QA.
- [ ] Emails de notificación validados manualmente contra Mailtrap en staging.

---

## 5. Matriz de Cobertura

| ID Escenario | Historia | Nivel | Herramienta | Prioridad | Automatizable V1 |
|---|---|:---:|---|:---:|:---:|
| HU-01-S1 | Login exitoso Usuario | Integración | Supertest | P1 | ✅ |
| HU-01-S2 | Login exitoso Admin | Integración | Supertest | P1 | ✅ |
| HU-01-S3 | Credenciales incorrectas | Integración | Supertest | P1 | ✅ |
| HU-01-S4 | Sesión expirada → redirect | Manual | — | P1 | ❌ (requiere e2e) |
| HU-01-S5 | Cierre de sesión invalida token | Integración | Supertest | P1 | ✅ |
| HU-02-S1 | Creación con campos mínimos | Integración | Supertest | P1 | ✅ |
| HU-02-S2 | Creación con todos los campos + email | Integración | Supertest | P1 | ✅ |
| HU-02-S3 | Edición de ticket propio | Integración | Supertest | P1 | ✅ |
| HU-02-S4 | Edición de ticket ajeno rechazada | Integración | Supertest | P1 | ✅ |
| HU-02-S5 | Archivado y vista solo lectura | Integración + Manual | Supertest + manual | P1 | Parcial |
| HU-02-S6 | Conflicto de versión (optimistic lock) | Integración | Supertest | P1 | ✅ |
| HU-03-S1 | Visualización 4 columnas | Manual | — | P2 | ❌ (requiere e2e) |
| HU-03-S2 | Cambio de estado + email | Integración | Supertest | P1 | ✅ |
| HU-03-S3 | Cambio de estado rechazado (ajeno) | Integración | Supertest | P1 | ✅ |
| HU-03-S4 | Filtro por un criterio | Integración | Supertest | P2 | ✅ |
| HU-03-S5 | Filtros combinados | Integración | Supertest | P2 | ✅ |
| HU-03-S6 | Búsqueda de texto libre | Integración | Supertest | P2 | ✅ |
| HU-03-S7 | Tablero sin resultados | Integración + Manual | Supertest + manual | P2 | Parcial |
| EC-01-S1 | Archivado concurrente bloquea guardado | Integración | Supertest | P1 | ✅ |
| EC-01-S2 | Formulario en pestaña vieja → solo lectura | Manual | — | P2 | ❌ (requiere e2e) |
| EC-02-S1 | UI no muestra usuarios desactivados | Manual | — | P1 | ❌ (requiere e2e) |
| EC-02-S2 | API rechaza asignación a usuario desactivado | Integración | Supertest | P1 | ✅ |
| EC-02-S3 | Desactivación no suprime tickets; suprime emails | Integración | Supertest | P1 | ✅ |

**Resumen:** 23 escenarios — 16 automatizables en V1 (70 %), 4 solo manuales, 3 parciales.

---

## 6. Casos de Prueba Detallados

---

### HU-01 — Autenticación

#### TP-01-01 · Login exitoso genera JWT válido `[P1 · Integración]`
```
Precondición : usuario "sofia@empresa.com" activo en DB con hash de contraseña correcto
Petición     : POST /api/auth/login { email, password }
Afirmaciones :
  - status 200
  - body contiene accessToken (JWT decodificable, exp = now + 1h)
  - body contiene refreshToken
  - payload JWT incluye { userId, role: "Usuario" }
```

#### TP-01-02 · Roles en JWT son correctos para Admin `[P1 · Integración]`
```
Precondición : usuario "admin@empresa.com" con rol "Admin" en DB
Petición     : POST /api/auth/login { email, password }
Afirmaciones :
  - payload JWT incluye { role: "Admin" }
  - GET /api/users (ruta solo-Admin) con ese token → status 200
  - El mismo GET con token de Usuario → status 403
```

#### TP-01-03 · Error genérico en credenciales incorrectas `[P1 · Integración]`
```
Casos (parametrizados):
  a) email inexistente + contraseña cualquiera
  b) email existente + contraseña incorrecta
Afirmaciones para ambos casos:
  - status 401
  - body.message NO menciona "email" ni "contraseña" individualmente
  - body.message idéntico en caso a) y b) (no distingue)
  - No se devuelve ningún dato del usuario
```

#### TP-01-04 · Sesión expirada redirige conservando URL `[P1 · Manual]`
```
Pasos manuales:
  1. Iniciar sesión y navegar a /tickets/42
  2. Manipular el token en localStorage para que esté expirado (o esperar 1h en staging)
  3. Recargar la página
Resultado esperado:
  - Redirect a /login?redirect=/tickets/42
  - Tras login exitoso, redirige a /tickets/42
```

#### TP-01-05 · Logout invalida el refresh token en servidor `[P1 · Integración]`
```
Precondición : sesión activa con refreshToken almacenado
Petición 1   : POST /api/auth/logout con refreshToken
Petición 2   : POST /api/auth/refresh con el mismo refreshToken
Afirmaciones :
  - Petición 1 → status 200
  - Petición 2 → status 401 (token ya no válido)
```

---

### HU-02 — Gestión de Tickets

#### TP-02-01 · Creación con campos mínimos aplica defaults `[P1 · Integración]`
```
Precondición : usuario autenticado con rol "Usuario"
Petición     : POST /api/tickets { title: "Fix login bug" }
Afirmaciones :
  - status 201
  - body.status === "Por hacer"
  - body.priority === "Media"
  - body.createdBy === userId del token
  - body.createdAt es timestamp reciente (< 2s de diferencia)
  - body.version === 1
```

#### TP-02-02 · Creación completa dispara email al asignado `[P1 · Integración]`
```
Precondición : "sofia@empresa.com" (creador) y "roberto@empresa.com" (asignado) activos
Petición     : POST /api/tickets { title, description, priority: "Alta", assignedTo: robertoId, tags: ["api","v1","bug"] }
Afirmaciones :
  - status 201
  - body refleja exactamente los valores enviados
  - El transporte de test captura 1 email con:
      to: "roberto@empresa.com"
      subject contiene el título del ticket
```

#### TP-02-03 · Edición propia actualiza updatedAt `[P1 · Integración]`
```
Precondición : ticket #10 creado por sofia; sofia autenticada
Petición     : PATCH /api/tickets/10 { title: "Nuevo título", version: 1 }
Afirmaciones :
  - status 200
  - body.title === "Nuevo título"
  - body.updatedAt > body.createdAt
  - body.version === 2
```

#### TP-02-04 · Usuario no puede editar ticket ajeno `[P1 · Integración]`
```
Precondición : ticket #20 creado por admin; sofia autenticada como Usuario
Petición     : PATCH /api/tickets/20 { title: "Hack" } con token de sofia
Afirmaciones :
  - status 403
  - GET /api/tickets/20 → title sin cambio
```

#### TP-02-05 · Archivado oculta ticket del tablero `[P1 · Integración + Manual]`
```
[Integración]
Precondición : ticket #30 activo, creado por sofia
Petición     : DELETE /api/tickets/30 con token de sofia
Afirmaciones :
  - status 200
  - body.archivedAt es timestamp (no null)
  - GET /api/tickets (tablero principal) no incluye ticket #30
  - GET /api/tickets?archived=true incluye ticket #30
  - PATCH /api/tickets/30 (intento de edición) → status 423 o 403

[Manual]
  - En la vista de archivados, todos los campos del ticket #30 son de solo lectura
  - No existe botón "Guardar" ni "Editar"
```

#### TP-02-06 · Bloqueo optimista rechaza segunda escritura `[P1 · Integración]`
```
Precondición : ticket #50, version=5 en DB
Petición 1   : PATCH /api/tickets/50 { title: "A", version: 5 } → ejecuta primero
Petición 2   : PATCH /api/tickets/50 { title: "B", version: 5 } → ejecuta inmediatamente después
Método       : Promise.all([req1, req2])
Afirmaciones :
  - Una petición retorna status 200 con version=6
  - La otra retorna status 409
  - GET /api/tickets/50 → exactamente uno de los dos títulos, version=6
```

---

### HU-03 — Tablero Kanban con Filtros

#### TP-03-01 · Visualización de las 4 columnas `[P2 · Manual]`
```
Pasos manuales (Chrome y Firefox):
  1. Iniciar sesión con cualquier rol
  2. Navegar al tablero principal
Resultado esperado:
  - 4 columnas visibles en orden: "Por hacer", "En progreso", "Bloqueado", "Listo"
  - Cada tarjeta muestra: título, badge de prioridad, avatar/nombre de asignado, etiquetas
  - No aparece ningún ticket con archivedAt != null
```

#### TP-03-02 · Cambio de estado dispara email `[P1 · Integración]`
```
Precondición : ticket #60, creador sofia, asignado roberto, estado "Por hacer"
Petición     : PATCH /api/tickets/60 { status: "En progreso", version: 1 } con token de sofia
Afirmaciones :
  - status 200
  - body.status === "En progreso"
  - El transporte de test captura 1 email con to: "roberto@empresa.com"
```

#### TP-03-03 · Cambio de estado rechazado para usuario sin relación con el ticket `[P1 · Integración]`
```
Precondición : ticket #70, creado por admin, asignado a admin; sofia no tiene relación
Petición     : PATCH /api/tickets/70 { status: "Listo", version: 1 } con token de sofia
Afirmaciones :
  - status 403
  - GET /api/tickets/70 → status sin cambio
```

#### TP-03-04 · Filtro simple retorna solo tickets coincidentes `[P2 · Integración]`
```
Precondición : 10 tickets en DB; 3 con priority="Alta", 7 con priority distinta
Petición     : GET /api/tickets?priority=Alta
Afirmaciones :
  - body.data.length === 3
  - Todos los ítems tienen priority === "Alta"
  - Ningún ticket archivado aparece en los resultados
```

#### TP-03-05 · Filtros combinados aplican AND `[P2 · Integración]`
```
Precondición : tickets variados en DB (ver fixture de test)
Petición     : GET /api/tickets?priority=Alta&assignedTo=sofiaId
Afirmaciones :
  - Todos los ítems tienen priority "Alta" Y assignedTo sofiaId
  - Si ningún ticket cumple ambas → body.data es array vacío, status 200
```

#### TP-03-06 · Búsqueda de texto busca en título Y descripción `[P2 · Integración]`
```
Precondición :
  - Ticket A: title="Fix login bug", description="nada relevante"
  - Ticket B: title="Tarea normal", description="revisar el login flow"
  - Ticket C: title="Deploy", description="sin mención"
Petición     : GET /api/tickets?q=login
Afirmaciones :
  - Incluye Ticket A y Ticket B
  - No incluye Ticket C
```

#### TP-03-07 · Búsqueda sin resultados retorna array vacío con status 200 `[P2 · Integración]`
```
Petición     : GET /api/tickets?q=xyzterminoquenoexiste
Afirmaciones :
  - status 200 (no 404)
  - body.data === []
```

---

### EC-01 — Archivado Concurrente

#### TP-EC01-01 · Guardar sobre ticket ya archivado retorna error descriptivo `[P1 · Integración]`
```
Precondición : ticket #42, version=7, activo
Paso 1       : Admin archiva → DELETE /api/tickets/42 (status 200 esperado)
Paso 2       : Usuario A intenta editar → PATCH /api/tickets/42 { title: "X", version: 7 }
Afirmaciones del Paso 2:
  - status 423 (Locked) o 409 (Conflict) — NO 500
  - body.message contiene indicación de que el ticket está archivado
  - GET /api/tickets/42?archived=true → archivedAt no es null, title sin cambio
```

#### TP-EC01-02 · Formulario abierto sobre ticket archivado muestra solo lectura `[P2 · Manual]`
```
Pasos manuales:
  1. Usuario A abre ticket #42 en pestaña A (estado activo)
  2. Admin archiva ticket #42 desde otra sesión
  3. En la pestaña A, Usuario A intenta modificar el título (sin recargar la página)
Resultado esperado:
  - Los campos se vuelven no editables (disabled/readonly)
  - Aparece aviso "Este ticket fue archivado y es de solo lectura"
  - El botón Guardar desaparece o queda deshabilitado
Nota: Este comportamiento requiere polling o WebSocket. Si no está implementado,
      el aviso debe aparecer al intentar guardar (servidor lo rechaza con TP-EC01-01).
```

---

### EC-02 — Asignación a Usuario Desactivado

#### TP-EC02-01 · UI filtra usuarios desactivados del selector `[P1 · Manual]`
```
Precondición : "marcos@empresa.com" desactivado en DB
Pasos manuales:
  1. Admin abre formulario de creación de ticket
  2. Hace clic en el campo "Asignado a"
Resultado esperado:
  - "marcos@empresa.com" / "Marcos" no aparece en la lista desplegable
  - Solo aparecen usuarios con is_active = true
```

#### TP-EC02-02 · API rechaza asignación directa a usuario desactivado `[P1 · Integración]`
```
Precondición : marcos desactivado (userId: marcosId conocido)
Petición     : PATCH /api/tickets/17 { assignedTo: marcosId } con token de Admin
Afirmaciones :
  - status 422
  - body.error menciona que el usuario está desactivado
  - GET /api/tickets/17 → assignedTo sin cambio
```

#### TP-EC02-03 · Desactivar usuario suprime emails futuros pero preserva tickets `[P1 · Integración]`
```
Precondición : marcos activo, asignado a tickets #80, #81, #82, #83
Paso 1       : Admin desactiva marcos → PATCH /api/users/marcosId { isActive: false }
               Afirmar: status 200
Paso 2       : GET /api/tickets?assignedTo=marcosId
               Afirmar: los 4 tickets siguen con assignedTo = marcosId
Paso 3       : Provocar evento que dispararía email a marcos
               (ej: cambiar estado de ticket #80)
               Afirmar: el transporte de test NO captura ningún email con to: "marcos@empresa.com"
Paso 4       : Intentar login con marcos
               Afirmar: POST /api/auth/login → status 401 o 403
```

---

## 7. Gestión de Riesgos de Calidad

| Riesgo | Probabilidad | Impacto | Mitigación en QA |
|---|:---:|:---:|---|
| Permisos forzados solo en frontend | Alta | Crítico | Todos los escenarios de permisos tienen prueba de integración independiente de la UI |
| Bloqueo optimista no cubre archivado concurrente | Alta | Alto | TP-EC01-01 fuerza el escenario con dos peticiones secuenciales controladas |
| Emails enviados a usuarios desactivados | Media | Alto | TP-EC02-03 valida la supresión en el mismo test de desactivación |
| Estado `version` no se incrementa en cambio de estado | Media | Alto | TP-03-02 afirma `version` después de cambio de estado |
| Tokens JWT no invalidados en logout | Media | Alto | TP-01-05 usa el refresh token después del logout y espera 401 |
| Filtros combinados implementados como OR en vez de AND | Media | Medio | TP-03-05 usa fixture donde la intersección es 0 para detectar falso positivo |

---

## 8. Gaps Conocidos (no cubiertos en V1)

| Gap | Motivo | Mitigación |
|---|---|---|
| Redirect tras sesión expirada conserva URL (HU-01-S4) | Requiere e2e | Prueba manual obligatoria en staging antes de producción |
| Formulario en pestaña vieja → solo lectura (EC-01-S2) | Requiere e2e | Manual; documentar comportamiento degradado aceptable si no hay WebSocket |
| UI no muestra usuarios desactivados en selector (EC-02-S1) | Requiere e2e | Manual; TP-EC02-02 cubre la validación de seguridad real (backend) |
| Visualización correcta de 4 columnas (HU-03-S1) | Requiere e2e | Manual en Chrome y Firefox como requisito de salida |
| Entrega real de email (todos los escenarios con email) | SMTP de producción no disponible en CI | Mailtrap en staging; checklist manual pre-deploy |
| Búsqueda con acentos y caracteres especiales | No definido en PRD | Registrar como deuda técnica; definir collation en Postgres |

---

## 9. Orden de Ejecución en CI (GitHub Actions)

```
1. lint + type-check          (falla rápido, no consume DB)
2. Vitest unit tests           (sin DB)
3. Docker Compose up (test DB)
4. Prisma migrate deploy
5. Supertest integration tests (con DB efímera)
6. Docker Compose down
```

Los escenarios marcados como `Manual` se ejecutan antes de cada despliegue a staging y son requisito para el criterio de salida de producción.

---

## 10. Edge Cases Críticos — Matriz de Riesgo

**Fórmula:** `Risk Score = Probabilidad × Impacto`

| Escala | Probabilidad | Impacto |
|---|---|---|
| 1 | Baja (< 10 % de usuarios/sesiones) | Bajo (molestia visual, workaround inmediato) |
| 2 | Media (flujo normal con condiciones de red) | Medio (dato incorrecto, acción no esperada) |
| 3 | Alta (cualquier usuario puede reproducirlo) | Alto (pérdida de datos, acción no autorizada) |
| 4 | — | Crítico (corrupción de datos, bypass de seguridad) |

| ID | Edge Case | Probabilidad | Impacto | **Risk Score** | Nivel |
|---|---|:---:|:---:|:---:|---|
| EC-05 | JWT válido de usuario recién desactivado | 2 | 4 | **8** | Crítico |
| EC-06 | TOCTOU en bloqueo optimista sin atomicidad | 2 | 4 | **8** | Crítico |
| EC-03 | Doble envío post-falla de red | 2 | 3 | **6** | Alto |
| EC-04 | Título nulo o solo espacios en blanco | 3 | 2 | **6** | Alto |
| EC-07 | Tormenta de emails en operaciones en cascada | 2 | 3 | **6** | Alto |

---

### EC-03 — Doble Envío Post-Falla de Red `[Risk: 6 — Alto]`

**Por qué rompe el MVP:** La red cae después de que el servidor confirma la escritura en DB pero antes de que la respuesta llegue al cliente. El cliente reintenta, el servidor procesa dos veces: incrementa `version` a N+2 y el usuario ve un `409` pensando que perdió sus cambios cuando el primero sí se guardó.

**Mitigación:** `Idempotency-Key: uuid` en el header. El servidor guarda el resultado de la primera petición por 60s; peticiones repetidas con la misma key devuelven el mismo resultado sin re-ejecutar.

```gherkin
Feature: Idempotencia en guardado de ticket

  Background:
    Given que el ticket #55 tiene version=3 en base de datos

  Scenario: Red cae tras confirmación del servidor; cliente reintenta
    Given que el Usuario A envía PATCH /tickets/55 con { title: "Nuevo", version: 3 }
    And el servidor guarda el cambio y responde 200 pero la respuesta no llega al cliente
    When el cliente reintenta la misma petición con el mismo Idempotency-Key
    Then el servidor devuelve 200 con el mismo resultado que la primera vez
    And el título del ticket sigue siendo "Nuevo"
    And la version del ticket es 4, no 5

  Scenario: Dos peticiones distintas sin Idempotency-Key no son idempotentes
    Given que el Usuario A envía dos peticiones diferentes sobre el ticket #55
    When ambas peticiones llegan al servidor con versiones distintas
    Then cada petición se procesa de forma independiente según su version
```

---

### EC-04 — Título Nulo o Solo Espacios en Blanco `[Risk: 6 — Alto]`

**Por qué rompe el MVP:** `título` es campo requerido (§2.2). Sin validación en backend, un cliente HTTP puede enviar `""` o `"   "`. Prisma lanzará un error no controlado (500) o almacenará un título vacío que rompe el render de tarjetas y la búsqueda de texto libre.

**Mitigación:** Validar `title.trim().length >= 1` y `title.length <= 120` antes del ORM. Retornar `422` con mensaje descriptivo.

```gherkin
Feature: Validación de campos obligatorios en ticket

  Scenario Outline: Título inválido es rechazado antes de llegar a la base de datos
    Given que estoy autenticado como cualquier usuario
    When envío POST /api/tickets con title = "<valor>"
    Then el servidor responde con status 422
    And el mensaje de error menciona que el título es obligatorio
    And no se crea ningún registro en la base de datos

    Examples:
      | valor            |
      |                  |  # string vacío
      |      espacios    |  # solo espacios
      | <null>           |  # campo ausente en JSON
      | 121 caracteres   |  # excede máximo de 120 chars

  Scenario: Título con espacios al inicio/final se guarda sin ellos
    Given que envío POST /api/tickets con title = "  Fix bug  "
    Then el ticket se crea con title = "Fix bug"
    And el status de respuesta es 201
```

---

### EC-05 — JWT Válido de Usuario Recién Desactivado `[Risk: 8 — Crítico]`

**Por qué rompe el MVP:** Los JWT son stateless — una vez emitido, el token es válido hasta su expiración (1h). Si el Admin desactiva a un usuario, ese usuario puede seguir operando hasta 1 hora sin control del servidor: creando tickets, cambiando estados, comentando. Es el bypass de seguridad más silencioso del sistema.

**Mitigación:** En cada middleware de autenticación, después de verificar la firma JWT, consultar `users.findUnique({ id })` y verificar `isActive === true`. Se puede cachear con TTL de 30s si el volumen lo requiere.

```gherkin
Feature: Revocación efectiva de sesión al desactivar usuario

  Background:
    Given que "sofia@empresa.com" tiene un JWT válido emitido hace 10 minutos
    And el Admin desactiva la cuenta de "sofia@empresa.com"

  Scenario: Token aún vigente es rechazado tras desactivación
    When "sofia@empresa.com" envía GET /api/tickets con ese token
    Then el servidor responde con status 401
    And el mensaje indica que la cuenta está desactivada
    And no se devuelve ningún dato

  Scenario: Token vigente no puede crear ni modificar datos tras desactivación
    When "sofia@empresa.com" intenta crear un ticket con su JWT aún válido
    Then el servidor responde con status 401
    And ningún ticket es creado en la base de datos

  Scenario: Admin reactiva usuario y el token anterior sigue sin ser válido
    Given que el Admin reactiva a "sofia@empresa.com"
    When "sofia@empresa.com" usa el JWT emitido antes de la desactivación
    Then el servidor responde con status 401
    And "sofia@empresa.com" debe iniciar sesión de nuevo para obtener un token fresco
```

---

### EC-06 — TOCTOU en Bloqueo Optimista Sin Atomicidad `[Risk: 8 — Crítico]`

**Por qué rompe el MVP:** Si la implementación separa el `SELECT` (verificar versión) del `UPDATE` (escribir) en dos queries distintas sin transacción atómica, dos peticiones concurrentes pueden ambas pasar la verificación con `version=5`, ambas escribir y ambas devolver `200`. El dato del primero queda sobreescrito silenciosamente — sin `409`, sin aviso, con corrupción de datos transparente.

**Mitigación:** El `UPDATE` debe ser atómico: `UPDATE tickets SET title=?, version=version+1 WHERE id=? AND version=?` en una sola query. Si `rowsAffected === 0` → retornar `409`. Sin SELECT previo separado.

```gherkin
Feature: Atomicidad del bloqueo optimista

  Background:
    Given que el ticket #99 tiene version=10 en base de datos

  Scenario: Dos escrituras simultáneas con la misma version solo persiste una
    Given que el Usuario A y el Usuario B obtienen el ticket #99 con version=10
    When ambos envían PATCH /tickets/99 con version=10 exactamente al mismo tiempo
    Then exactamente una petición retorna status 200 con version=11
    And la otra retorna status 409
    And GET /tickets/99 devuelve version=11 con el contenido de solo uno de los dos

  Scenario: La versión en base de datos nunca salta más de 1 por operación
    Given que se ejecutan 50 escrituras concurrentes sobre el ticket #99 con version=10
    When todas las peticiones se procesan
    Then exactamente 1 petición retorna status 200
    And GET /tickets/99 devuelve version=11
    And las 49 peticiones restantes retornan status 409
```

---

### EC-07 — Tormenta de Emails en Operaciones en Cascada `[Risk: 6 — Alto]`

**Por qué rompe el MVP:** Si un Admin reasigna o cambia el estado de varios tickets rápidamente, Nodemailer intenta abrir conexiones SMTP simultáneas por cada ticket. Con un SMTP de bajo throughput (Mailtrap en dev), el servidor Node puede saturar el pool de conexiones, los envíos fallan silenciosamente, o el event loop se bloquea afectando a todos los usuarios activos.

**Mitigación:** Cola de emails asíncrona con concurrencia limitada (`p-limit` o un worker simple). Los emails se encolan y procesan en background (máx. 3 conexiones SMTP simultáneas). El endpoint no espera a que los emails salgan para devolver `200`.

```gherkin
Feature: Resiliencia del sistema de notificaciones

  Scenario: Cambio masivo de estado no bloquea las respuestas de la API
    Given que existen 20 tickets asignados a "roberto@empresa.com"
    When el Admin cambia el estado de los 20 tickets en menos de 5 segundos
    Then cada petición PATCH retorna status 200 en menos de 200ms
    And los 20 emails se encolan para envío asíncrono
    And ninguna petición falla por timeout de SMTP

  Scenario: Fallo del servidor SMTP no provoca error 500 en la API
    Given que el servidor SMTP no está disponible
    When se crea un ticket con usuario asignado
    Then el servidor responde 201 (ticket creado correctamente)
    And el intento de email se registra en log con nivel "error"
    And el ticket queda en estado válido en base de datos

  Scenario: Email no enviado no revierte la operación de negocio
    Given que el SMTP falla durante el envío de notificación de asignación
    When el sistema detecta el fallo de envío
    Then el ticket permanece asignado al usuario destino
    And la asignación no se deshace por el fallo del email
```

---

### Resumen ejecutivo para el Tech Lead

| Acción inmediata | Edge Case | Costo ahora vs. en prod |
|---|---|---|
| `UPDATE WHERE version=N` atómico en una sola query | EC-06 | Horas ahora · semanas en prod (corrupción de datos) |
| Verificar `isActive` en cada request autenticado | EC-05 | 1 línea en middleware · incidente de seguridad en prod |
| Cola async para emails con `p-limit` | EC-07 | 1 día ahora · degradación de servicio en prod |
| `Idempotency-Key` en PATCH/POST | EC-03 | Medio sprint ahora · difícil de retro-fitear post-lanzamiento |
| Validación `trim()` + longitud en título | EC-04 | 30 minutos ahora · bug de render en tablero en prod |

---

*Este plan de pruebas es un contrato vivo. Cualquier cambio en los escenarios Gherkin del backlog debe reflejarse aquí antes de cerrar el sprint correspondiente.*
