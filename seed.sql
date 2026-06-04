-- ============================================================
-- SEED — Mini Jira v1.0 — Solo para desarrollo / Supabase SQL Editor
-- Ejecutar DESPUES de schema.sql
-- Contraseña de todos los usuarios: Password123!
-- ============================================================

-- ── UUIDs fijos para datos reproducibles ─────────────────────
-- Laura   → a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11  (Admin)
-- Sofía   → b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22  (Usuario)
-- Marcos  → c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33  (Usuario)


-- ── 1. Usuarios en auth.users ────────────────────────────────
-- El trigger trg_new_auth_user crea la fila en public.usuarios
-- usando raw_user_meta_data->>'nombre' como nombre de perfil.

INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
) VALUES
(
    '00000000-0000-0000-0000-000000000000',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'authenticated',
    'authenticated',
    'laura@minijira.dev',
    crypt('Password123!', gen_salt('bf')),
    NOW(),
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '30 days',
    '{"provider": "email", "providers": ["email"]}',
    '{"nombre": "Laura García"}'
),
(
    '00000000-0000-0000-0000-000000000000',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'authenticated',
    'authenticated',
    'sofia@minijira.dev',
    crypt('Password123!', gen_salt('bf')),
    NOW(),
    NOW() - INTERVAL '28 days',
    NOW() - INTERVAL '28 days',
    '{"provider": "email", "providers": ["email"]}',
    '{"nombre": "Sofía Morales"}'
),
(
    '00000000-0000-0000-0000-000000000000',
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'authenticated',
    'authenticated',
    'marcos@minijira.dev',
    crypt('Password123!', gen_salt('bf')),
    NOW(),
    NOW() - INTERVAL '27 days',
    NOW() - INTERVAL '27 days',
    '{"provider": "email", "providers": ["email"]}',
    '{"nombre": "Marcos Ruiz"}'
);

-- El trigger ya creó las filas en public.usuarios con rol='usuario'.
-- Solo necesitamos promover a Laura a Admin.
UPDATE usuarios
SET rol = 'admin'
WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';


-- ── 2. Etiquetas ─────────────────────────────────────────────

INSERT INTO etiquetas (nombre) VALUES
('frontend'),
('backend'),
('devops'),
('auth'),
('ui');


-- ── 3. Tickets ───────────────────────────────────────────────

INSERT INTO tickets (
    titulo, descripcion, estado, prioridad,
    creado_en, actualizado_en,
    creado_por_id, asignado_a_id
) VALUES
(
    'Diseñar pantalla de login',
    E'Crear los wireframes y el componente React para la pantalla de login.\n\n'
    '**Criterios de aceptación:**\n'
    '- Campos email y contraseña con validación en cliente\n'
    '- Mensaje de error genérico que no distinga email vs contraseña\n'
    '- Redirección al tablero tras login exitoso',
    'por_hacer',
    'alta',
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '25 days',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',  -- creado por Laura
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'   -- asignado a Sofía
),
(
    'Implementar API de autenticación JWT',
    E'Endpoint POST /auth/login que valida credenciales y devuelve access token (1h) '
    'y refresh token (7 días) vía httpOnly cookie.\n\n'
    '**Notas técnicas:**\n'
    '- Usar bcrypt para verificar contraseña\n'
    '- Access token en header Authorization\n'
    '- Refresh token en cookie httpOnly con SameSite=Strict',
    'en_progreso',
    'alta',
    NOW() - INTERVAL '22 days',
    NOW() - INTERVAL '3 days',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',  -- creado por Laura
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'   -- asignado a Marcos
),
(
    'Crear componente Kanban Board',
    E'Tablero con 4 columnas: Por hacer · En progreso · Bloqueado · Listo.\n\n'
    '**Requisitos:**\n'
    '- Drag & drop entre columnas con @dnd-kit\n'
    '- Cards con título, prioridad, asignado y número de comentarios\n'
    '- Columnas con conteo de tickets activos',
    'en_progreso',
    'media',
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '5 days',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',  -- creado por Sofía
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'   -- asignado a Sofía
),
(
    'Configurar pipeline CI/CD con GitHub Actions',
    E'Workflow que ejecute lint + type-check + tests en cada PR contra main.\n\n'
    '**Bloqueado por:** la rama main aún no tiene protección de rama activada en el repo. '
    'Esperando que Roberto habilite los settings en GitHub.\n\n'
    '**Jobs a incluir:**\n'
    '1. `lint` — ESLint + Prettier check\n'
    '2. `typecheck` — tsc --noEmit\n'
    '3. `test` — Vitest + Supertest',
    'bloqueado',
    'media',
    NOW() - INTERVAL '18 days',
    NOW() - INTERVAL '2 days',
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',  -- creado por Marcos
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'   -- asignado a Marcos
),
(
    'Desplegar en entorno de staging',
    E'Subir la imagen Docker a la VPS de staging y verificar que la app funciona '
    'end-to-end antes de la demo con el equipo.\n\n'
    '**Checklist post-deploy:**\n'
    '- [ ] Variables de entorno correctas en servidor\n'
    '- [ ] Migraciones de BD ejecutadas\n'
    '- [ ] Login funciona con usuario de prueba\n'
    '- [ ] Emails llegan vía Mailtrap',
    'listo',
    'baja',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '1 day',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',  -- creado por Laura
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'   -- asignado a Marcos
);


-- ── 4. Comentarios ───────────────────────────────────────────

INSERT INTO comentarios (texto, creado_en, ticket_id, autor_id) VALUES
(
    'JWT con expiración de 1h para el access token y 7 días para el refresh. '
    'El refresh lo mando en httpOnly cookie para que JS no pueda leerlo.',
    NOW() - INTERVAL '3 days',
    2,  -- Ticket: API JWT
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'  -- Marcos
),
(
    '¿Renovamos el access token en cada request o solo cuando caduque? '
    'Con TanStack Query podría gestionar el retry automático.',
    NOW() - INTERVAL '2 days 18 hours',
    2,  -- Ticket: API JWT
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'  -- Sofía
),
(
    'Solo cuando caduque. Si renovamos en cada request multiplicamos '
    'la carga innecesariamente. El interceptor de Axios puede atrapar el 401 '
    'y hacer el refresh transparente.',
    NOW() - INTERVAL '2 days 10 hours',
    2,  -- Ticket: API JWT
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'  -- Marcos
),
(
    'El tablero debe soportar drag & drop entre columnas. '
    'Recomiendo @dnd-kit en lugar de react-beautiful-dnd, que ya no recibe mantenimiento.',
    NOW() - INTERVAL '5 days',
    3,  -- Ticket: Kanban Board
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'  -- Laura
),
(
    'Confirmado, estoy usando @dnd-kit/core. Los sensores de teclado '
    'vienen incluidos así que la accesibilidad está cubierta sin trabajo extra.',
    NOW() - INTERVAL '4 days 6 hours',
    3,  -- Ticket: Kanban Board
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'  -- Sofía
),
(
    'Roberto confirmó que activa la protección de rama esta tarde. '
    'En cuanto esté lista retomo el workflow.',
    NOW() - INTERVAL '2 days',
    4,  -- Ticket: CI/CD
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'  -- Marcos
);


-- ── 5. Etiquetas por ticket ───────────────────────────────────

INSERT INTO ticket_etiquetas (ticket_id, etiqueta_id)
SELECT t.id, e.id
FROM (VALUES
    (1, 'frontend'),
    (1, 'ui'),
    (2, 'backend'),
    (2, 'auth'),
    (3, 'frontend'),
    (3, 'ui'),
    (4, 'devops'),
    (5, 'devops')
) AS rel(ticket_num, etiqueta_nombre)
JOIN tickets  t ON t.id = rel.ticket_num
JOIN etiquetas e ON e.nombre = rel.etiqueta_nombre;


-- ── Verificación rápida ──────────────────────────────────────

SELECT
    u.nombre,
    u.email,
    u.rol,
    u.activo
FROM usuarios u
ORDER BY u.rol DESC, u.nombre;

SELECT
    t.id,
    t.titulo,
    t.estado,
    t.prioridad,
    c.nombre AS creador,
    a.nombre AS asignado,
    t.version,
    t.archived_at
FROM tickets t
JOIN usuarios c ON c.id = t.creado_por_id
LEFT JOIN usuarios a ON a.id = t.asignado_a_id
ORDER BY t.id;

SELECT
    t.titulo AS ticket,
    e.nombre AS etiqueta
FROM ticket_etiquetas te
JOIN tickets   t ON t.id = te.ticket_id
JOIN etiquetas e ON e.id = te.etiqueta_id
ORDER BY t.id, e.nombre;
