# Backlog — Mini Jira MVP

**Fecha:** 2026-06-03  
**Referencias:** [specs.md](specs.md) · [prd_hu.md](prd_hu.md) · [test_plan.md](test_plan.md)  
**Orden de desarrollo:** HU-01 → HU-02 → HU-03 → EC-01 → EC-02

---

## Resumen del Backlog

| ID | Historia | Prioridad | Estado | Bloqueantes |
|---|---|:---:|---|---|
| HU-01 | Autenticación de Usuario | P1 | Listo para desarrollar | — |
| HU-02 | Gestión de Tickets | P1 | Listo para desarrollar | ⚠️ Ver nota HU-02 |
| HU-03 | Tablero Kanban con Filtros | P1 | Listo para desarrollar | ⚠️ Ver nota HU-03 |
| EC-01 | Archivado concurrente durante edición | P1 | Listo para desarrollar | — |
| EC-02 | Asignación a usuario desactivado | P1 | Listo para desarrollar | ⚠️ Ver nota EC-02 |

---

## HU-01 — Autenticación de Usuario

**Como** miembro del equipo  
**Quiero** iniciar y cerrar sesión con mis credenciales  
**Para** acceder solo a las funciones que mi rol permite

**Prioridad:** P1 — Bloqueante para todas las demás historias  
**Estado:** Listo para desarrollar  
**Tests asociados:** TP-01-01 al TP-01-05

```gherkin
Feature: Autenticación de usuario

  Background:
    Given que existe un usuario registrado con email "sofia@empresa.com" y rol "Usuario"
    And existe un usuario registrado con email "admin@empresa.com" y rol "Admin"

  Scenario: Inicio de sesión exitoso como Usuario
    Given que estoy en la pantalla de login
    When ingreso credenciales válidas de "sofia@empresa.com"
    Then accedo al tablero principal
    And solo veo las acciones permitidas para el rol "Usuario"

  Scenario: Inicio de sesión exitoso como Admin
    Given que estoy en la pantalla de login
    When ingreso credenciales válidas de "admin@empresa.com"
    Then accedo al tablero principal
    And veo las opciones de gestión de usuarios en el menú

  Scenario: Credenciales incorrectas
    Given que estoy en la pantalla de login
    When ingreso una contraseña incorrecta para un email registrado
    Then permanezco en la pantalla de login
    And veo un mensaje de error que no distingue si el email o la contraseña falló

  Scenario: Sesión expirada
    Given que tengo una sesión activa
    When mi token de acceso caduca
    Then soy redirigido a la pantalla de login sin perder la URL que intentaba visitar

  Scenario: Cierre de sesión
    Given que tengo una sesión activa
    When elijo cerrar sesión
    Then mi sesión queda invalidada en el servidor
    And soy redirigido a la pantalla de login
```

---

## HU-02 — Gestión de Tickets

**Como** miembro del equipo  
**Quiero** crear, editar y archivar tickets de trabajo  
**Para** registrar y dar seguimiento a las tareas del equipo

**Prioridad:** P1  
**Estado:** Listo para desarrollar  
**Tests asociados:** TP-02-01 al TP-02-06

> ⚠️ **Pendiente de validación (PO — Laura):** ¿Un usuario asignado a un ticket que no creó puede cambiarle el estado? La historia HU-02-S4 y HU-03-S3 asumen que no puede, alineado con la matriz de permisos del PRD §2.1. Validar antes de implementar el middleware de autorización.

```gherkin
Feature: Gestión de tickets

  Background:
    Given que estoy autenticado
    And existen usuarios: "sofia@empresa.com" (Usuario) y "admin@empresa.com" (Admin)

  Scenario: Creación de ticket con campos mínimos
    Given que soy cualquier usuario autenticado
    When creo un ticket con solo el título
    Then el ticket aparece en el tablero en estado "Por hacer"
    And la prioridad queda como "Media" por defecto
    And se registran automáticamente mi usuario como creador y la fecha de creación

  Scenario: Creación de ticket con todos los campos
    Given que soy cualquier usuario autenticado
    When creo un ticket con título, descripción, prioridad "Alta", asignado a otro usuario y 3 etiquetas
    Then el ticket refleja exactamente los valores ingresados
    And el usuario asignado recibe un email de notificación

  Scenario: Edición de ticket propio
    Given que soy el creador de un ticket activo
    When modifico el título o la descripción
    Then los cambios quedan guardados y se actualiza la fecha de modificación

  Scenario: Intento de edición de ticket ajeno como Usuario
    Given que soy un Usuario que no creó el ticket
    When intento modificar el título o la descripción
    Then el sistema rechaza la acción
    And los datos del ticket no cambian

  Scenario: Archivado de ticket propio
    Given que soy el creador de un ticket activo
    When elijo "Eliminar" el ticket
    Then el ticket desaparece del tablero principal
    And queda accesible en la vista de archivados en modo solo lectura

  Scenario: Edición simultánea genera conflicto
    Given que dos usuarios abren el mismo ticket al mismo tiempo
    When ambos intentan guardar cambios sobre la misma versión
    Then el segundo en guardar recibe un aviso de conflicto
    And los cambios del primero se preservan sin alteración
```

---

## HU-03 — Tablero Kanban con Filtros

**Como** miembro del equipo  
**Quiero** visualizar todos los tickets activos organizados por estado y filtrarlos  
**Para** entender el estado del trabajo del equipo de un vistazo

**Prioridad:** P1  
**Estado:** Listo para desarrollar  
**Tests asociados:** TP-03-01 al TP-03-07

> ⚠️ **Pendiente de validación (PO — Laura):** El PRD define 4 columnas ("Por hacer", "En progreso", "Bloqueado", "Listo"). Laura debe confirmar que 4 columnas es aceptable visualmente antes de maquetar el tablero.

```gherkin
Feature: Tablero Kanban

  Background:
    Given que estoy autenticado
    And existen tickets en los estados "Por hacer", "En progreso", "Bloqueado" y "Listo"

  Scenario: Visualización del tablero completo
    Given que accedo al tablero principal
    Then veo exactamente 4 columnas: "Por hacer", "En progreso", "Bloqueado" y "Listo"
    And cada ticket muestra título, prioridad, asignado y etiquetas
    And los tickets archivados no aparecen en ninguna columna

  Scenario: Cambio de estado de ticket propio
    Given que soy el creador de un ticket en estado "Por hacer"
    When muevo el ticket al estado "En progreso"
    Then el ticket aparece en la columna "En progreso"
    And el usuario asignado recibe un email de notificación del cambio

  Scenario: Intento de cambio de estado en ticket ajeno como Usuario
    Given que soy un Usuario que no creó ni está asignado al ticket
    When intento cambiar el estado del ticket
    Then el sistema rechaza la acción
    And el ticket permanece en su estado original

  Scenario: Filtro por un criterio
    Given que el tablero muestra todos los tickets activos
    When filtro por prioridad "Alta"
    Then solo veo tickets con prioridad "Alta" en todas las columnas
    And el conteo de cada columna refleja solo los tickets visibles

  Scenario: Filtros combinados
    Given que el tablero muestra todos los tickets activos
    When filtro por prioridad "Alta" y asignado a "sofia@empresa.com"
    Then solo veo tickets que cumplan ambas condiciones simultáneamente

  Scenario: Búsqueda de texto libre
    Given que el tablero muestra todos los tickets activos
    When escribo un término en la barra de búsqueda
    Then solo veo tickets cuyo título o descripción contenga ese término
    And los filtros activos se aplican en combinación con la búsqueda

  Scenario: Tablero sin resultados
    Given que aplico filtros que no coinciden con ningún ticket
    Then veo un mensaje indicando que no hay tickets con esos criterios
    And no se muestra ninguna tarjeta en el tablero
```

---

## EC-01 — Archivado Concurrente Durante Edición Activa

**Como** miembro del equipo que edita un ticket  
**Quiero** recibir un aviso claro si el ticket fue archivado mientras lo editaba  
**Para** no perder mis cambios sin entender qué ocurrió

**Prioridad:** P1  
**Estado:** Listo para desarrollar  
**Origen:** Intersección entre §2.2 (solo lectura en archivados) y §2.9 (bloqueo optimista)  
**Tests asociados:** TP-EC01-01 · TP-EC01-02

```gherkin
Feature: Conflicto por archivado concurrente

  Background:
    Given que el ticket #42 está activo en estado "En progreso"
    And el Usuario A tiene el ticket #42 abierto en modo edición con versión 7
    And el Admin B tiene permisos para archivar cualquier ticket

  Scenario: Admin archiva un ticket mientras otro usuario lo está editando
    Given que el Usuario A lleva 3 minutos editando el ticket #42
    When el Admin B archiva el ticket #42
    And el Usuario A intenta guardar sus cambios
    Then el sistema rechaza el guardado del Usuario A
    And el Usuario A ve el mensaje "Este ticket fue archivado y es de solo lectura"
    And los cambios del Usuario A no se persisten
    And el ticket #42 permanece archivado con los datos previos al archivado

  Scenario: Usuario intenta editar un ticket ya archivado desde una pestaña abierta
    Given que el Usuario A tiene el ticket #42 abierto desde antes de que fuera archivado
    When el Usuario A intenta modificar cualquier campo
    Then los campos del formulario se muestran como solo lectura
    And el Usuario A ve un aviso indicando que el ticket fue archivado
    And no existe botón de guardar visible en la interfaz
```

---

## EC-02 — Asignación a Usuario Desactivado

**Como** Admin  
**Quiero** que el sistema impida asignar tickets a usuarios desactivados  
**Para** evitar tickets huérfanos sin responsable activo y notificaciones a cuentas inaccesibles

**Prioridad:** P1  
**Estado:** Listo para desarrollar  
**Origen:** Gap en §2.8 — el PRD define qué pasa al desactivar pero no los límites operativos  
**Tests asociados:** TP-EC02-01 · TP-EC02-02 · TP-EC02-03

> ⚠️ **Pendiente de validación (PO — Laura/Roberto):** El PRD deja abierto si los tickets de un usuario desactivado se muestran con indicador "inactivo" o se dejan sin asignar. EC-02-S3 asume que permanecen asignados con indicador visual, alineado con la decisión más conservadora para evitar pérdida de información.

```gherkin
Feature: Asignación a usuario desactivado

  Background:
    Given que el usuario "marcos@empresa.com" está desactivado en el sistema
    And el Admin tiene sesión activa

  Scenario: Intento de asignar un ticket nuevo a un usuario desactivado
    Given que el Admin está creando un ticket nuevo
    When el Admin selecciona a "marcos@empresa.com" en el campo "Asignado a"
    Then "marcos@empresa.com" no aparece en la lista de usuarios disponibles
    And el campo "Asignado a" solo muestra usuarios activos

  Scenario: Intento de reasignar un ticket existente a un usuario desactivado via API
    Given que existe el ticket #17 activo
    When se envía una petición de reasignación con el ID de "marcos@empresa.com"
    Then el servidor responde con error 422
    And el mensaje de error indica que el usuario destino está desactivado
    And el campo "asignado_a" del ticket #17 no cambia

  Scenario: Desactivación de usuario con tickets asignados
    Given que "marcos@empresa.com" tiene 4 tickets activos asignados a su nombre
    When el Admin desactiva la cuenta de "marcos@empresa.com"
    Then los 4 tickets permanecen asignados a "marcos@empresa.com"
    And el nombre del usuario se muestra con un indicador visual de "inactivo" en el tablero
    And no se envía ningún email de notificación a "marcos@empresa.com" desde ese momento
```

---

## Notas de Gestión

### Pendientes de validación antes de iniciar desarrollo
| # | Pregunta | Afecta | Responsable |
|---|---|---|---|
| 1 | ¿Usuario asignado (sin ser creador) puede cambiar estado? | HU-02, HU-03 | Laura (PO) |
| 2 | ¿4 columnas en el tablero es aceptable visualmente? | HU-03 | Laura (PO) |
| 3 | ¿Tickets de usuario desactivado quedan asignados con indicador "inactivo"? | EC-02 | Laura / Roberto |

### Orden de implementación recomendado
```
Semana 1: HU-01 (auth) → HU-02 (tickets CRUD)
Semana 2: HU-03 (tablero + filtros) → EC-01 (archivado concurrente)
Semana 3: EC-02 (usuarios desactivados) → emails → dashboard
```

### Cobertura de tests
- **23 escenarios Gherkin** en total
- **16 automatizables** con Vitest + Supertest en CI (70 %)
- **4 requieren prueba manual** (e2e no está en stack V1)
- Detalle completo en [test_plan.md](test_plan.md)
