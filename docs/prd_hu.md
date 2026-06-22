# Historias de Usuario — Mini Jira MVP

**Rol:** Product Owner  
**Fecha:** 2026-06-03  
**Referencia:** [specs.md](specs.md) v1.0  
**Formato:** BDD Gherkin declarativo

---

## HU-01 — Autenticación de Usuario

**Como** miembro del equipo  
**Quiero** iniciar y cerrar sesión con mis credenciales  
**Para** acceder solo a las funciones que mi rol permite

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

---

## EC-01 — Archivado concurrente durante edición activa

**Origen:** Intersección entre la regla de solo lectura de tickets archivados (§2.2) y el bloqueo optimista (§2.9).  
**Riesgo:** El campo `version` no detecta este conflicto porque el segundo usuario no modifica datos del ticket, sino su estado de archivado. Sin manejo explícito, el editor podría sobreescribir o recibir un error genérico sin contexto.

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

## EC-02 — Asignación a usuario desactivado

**Origen:** El PRD define que usuarios desactivados no pueden iniciar sesión (§2.8), pero no especifica qué ocurre al intentar asignarles un ticket nuevo o al desactivar un usuario con tickets ya asignados.  
**Riesgo:** Sin validación, el sistema quedaría con tickets asignados a cuentas inaccesibles, generando emails a direcciones potencialmente inválidas y tickets huérfanos sin responsable real.

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

## Notas de PO

- **HU-01** es bloqueante para todo lo demás — debe completarse primero.
- **HU-02** y **HU-03** tienen dependencias entre sí (el tablero necesita tickets); desarrollar en paralelo con contrato de API acordado desde el día 1.
- Los 3 ⚠️ del PRD afectan HU-02 (permisos de usuario asignado) y HU-01/HU-02 (usuario desactivado) — resolver con Laura antes de iniciar sprint.
