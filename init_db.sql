-- ============================================================
-- SCHEMA — Mini Jira v1.0 — Supabase / PostgreSQL 16
-- Ejecutar en el SQL Editor de Supabase en este orden.
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────

CREATE TYPE rol_usuario      AS ENUM ('admin', 'usuario');
CREATE TYPE estado_ticket    AS ENUM ('por_hacer', 'en_progreso', 'bloqueado', 'listo');
CREATE TYPE prioridad_ticket AS ENUM ('alta', 'media', 'baja');


-- ── Helper: detectar si el usuario actual es Admin ───────────
-- SECURITY DEFINER para que la función pueda leer la tabla
-- usuarios aunque RLS esté activo en ella.

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
      AND rol = 'admin'
      AND activo = true
  );
$$;


-- ── Tabla: USUARIOS ──────────────────────────────────────────
-- La PK es el mismo UUID que gestiona Supabase Auth,
-- lo que permite usar auth.uid() directamente en RLS.

CREATE TABLE usuarios (
    id             UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre         TEXT        NOT NULL,
    email          TEXT        NOT NULL UNIQUE,
    rol            rol_usuario NOT NULL DEFAULT 'usuario',
    activo         BOOLEAN     NOT NULL DEFAULT true,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede ver todos los usuarios
-- (necesario para el selector de asignación de tickets).
CREATE POLICY "usuarios: leer todos"
    ON usuarios FOR SELECT
    TO authenticated
    USING (true);

-- Solo admin puede crear usuarios via SQL;
-- el alta normal ocurre via Supabase Auth + trigger (ver abajo).
CREATE POLICY "usuarios: insertar (admin)"
    ON usuarios FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

-- Admin puede modificar cualquier usuario (rol, activo).
-- Usuario solo puede cambiar su propio nombre.
CREATE POLICY "usuarios: actualizar (admin)"
    ON usuarios FOR UPDATE
    TO authenticated
    USING (is_admin());

CREATE POLICY "usuarios: actualizar propio nombre"
    ON usuarios FOR UPDATE
    TO authenticated
    USING (id = auth.uid() AND NOT is_admin())
    WITH CHECK (id = auth.uid());


-- ── Trigger: crear fila en usuarios al registrarse ───────────
-- Se dispara cuando Supabase Auth crea un nuevo auth.user.

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO usuarios (id, nombre, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
        NEW.email
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_auth_user
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();


-- ── Tabla: TICKETS ───────────────────────────────────────────

CREATE TABLE tickets (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titulo         TEXT             NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 120),
    descripcion    TEXT,
    estado         estado_ticket    NOT NULL DEFAULT 'por_hacer',
    prioridad      prioridad_ticket NOT NULL DEFAULT 'media',
    version        INTEGER          NOT NULL DEFAULT 1,
    archived_at    TIMESTAMPTZ,                              -- NULL = activo
    creado_en      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    creado_por_id  UUID             NOT NULL REFERENCES usuarios(id),
    asignado_a_id  UUID             REFERENCES usuarios(id)  -- nullable
);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios autenticados pueden leer todos los tickets.
CREATE POLICY "tickets: leer todos"
    ON tickets FOR SELECT
    TO authenticated
    USING (true);

-- Cualquier usuario activo puede crear un ticket.
CREATE POLICY "tickets: insertar"
    ON tickets FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = creado_por_id
        AND EXISTS (
            SELECT 1 FROM usuarios
            WHERE id = auth.uid() AND activo = true
        )
    );

-- Admin puede editar cualquier ticket.
CREATE POLICY "tickets: actualizar (admin)"
    ON tickets FOR UPDATE
    TO authenticated
    USING (is_admin());

-- Usuario solo puede editar sus propios tickets.
-- La restriccion de no reasignar se refuerza en la API (Express).
CREATE POLICY "tickets: actualizar propio"
    ON tickets FOR UPDATE
    TO authenticated
    USING (creado_por_id = auth.uid() AND NOT is_admin());

-- No se permite DELETE fisico; el archivado es via UPDATE de archived_at.


-- ── Trigger: auto-incrementar version en cada UPDATE ─────────
-- El cliente envia WHERE id = X AND version = N.
-- Si version no coincide el UPDATE afecta 0 filas → 409 en la API.

CREATE OR REPLACE FUNCTION increment_ticket_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tickets_version
    BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION increment_ticket_version();


-- ── Tabla: COMENTARIOS ───────────────────────────────────────

CREATE TABLE comentarios (
    id         BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    texto      TEXT        NOT NULL,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ticket_id  BIGINT      NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    autor_id   UUID        NOT NULL REFERENCES usuarios(id)
);

ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comentarios: leer todos"
    ON comentarios FOR SELECT
    TO authenticated
    USING (true);

-- Cualquier usuario activo puede comentar.
CREATE POLICY "comentarios: insertar"
    ON comentarios FOR INSERT
    TO authenticated
    WITH CHECK (
        autor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM usuarios
            WHERE id = auth.uid() AND activo = true
        )
    );

-- Admin borra cualquier comentario; usuario solo el suyo.
CREATE POLICY "comentarios: borrar (admin)"
    ON comentarios FOR DELETE
    TO authenticated
    USING (is_admin());

CREATE POLICY "comentarios: borrar propio"
    ON comentarios FOR DELETE
    TO authenticated
    USING (autor_id = auth.uid() AND NOT is_admin());

-- No hay UPDATE de comentarios (borrar y reescribir, segun PRD).


-- ── Tabla: ETIQUETAS ─────────────────────────────────────────
-- Nombres normalizados en minuscula para evitar duplicados.

CREATE TABLE etiquetas (
    id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre TEXT   NOT NULL UNIQUE
        CHECK (nombre = lower(trim(nombre)))
);

ALTER TABLE etiquetas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "etiquetas: leer todas"
    ON etiquetas FOR SELECT
    TO authenticated
    USING (true);

-- Cualquier usuario activo puede crear etiquetas nuevas.
CREATE POLICY "etiquetas: insertar"
    ON etiquetas FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios
            WHERE id = auth.uid() AND activo = true
        )
    );


-- ── Tabla: TICKET_ETIQUETAS ──────────────────────────────────

CREATE TABLE ticket_etiquetas (
    ticket_id   BIGINT NOT NULL REFERENCES tickets(id)   ON DELETE CASCADE,
    etiqueta_id BIGINT NOT NULL REFERENCES etiquetas(id) ON DELETE CASCADE,
    PRIMARY KEY (ticket_id, etiqueta_id)
);

ALTER TABLE ticket_etiquetas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_etiquetas: leer todas"
    ON ticket_etiquetas FOR SELECT
    TO authenticated
    USING (true);

-- Solo el creador del ticket o un admin puede agregar/quitar etiquetas.
CREATE POLICY "ticket_etiquetas: insertar"
    ON ticket_etiquetas FOR INSERT
    TO authenticated
    WITH CHECK (
        is_admin()
        OR EXISTS (
            SELECT 1 FROM tickets
            WHERE id = ticket_id AND creado_por_id = auth.uid()
        )
    );

CREATE POLICY "ticket_etiquetas: borrar"
    ON ticket_etiquetas FOR DELETE
    TO authenticated
    USING (
        is_admin()
        OR EXISTS (
            SELECT 1 FROM tickets
            WHERE id = ticket_id AND creado_por_id = auth.uid()
        )
    );


-- ── Trigger: maximo 5 etiquetas por ticket ───────────────────

CREATE OR REPLACE FUNCTION check_max_etiquetas()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF (
        SELECT COUNT(*) FROM ticket_etiquetas
        WHERE ticket_id = NEW.ticket_id
    ) >= 5 THEN
        RAISE EXCEPTION 'Un ticket no puede tener mas de 5 etiquetas';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_max_etiquetas
    BEFORE INSERT ON ticket_etiquetas
    FOR EACH ROW EXECUTE FUNCTION check_max_etiquetas();


-- ── Trigger: actualizado_en automatico ───────────────────────

CREATE OR REPLACE FUNCTION set_actualizado_en()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_usuarios_actualizado_en
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

CREATE TRIGGER trg_tickets_actualizado_en
    BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();


-- ── Indices ──────────────────────────────────────────────────

CREATE INDEX idx_tickets_creado_por  ON tickets(creado_por_id);
CREATE INDEX idx_tickets_asignado_a  ON tickets(asignado_a_id);
CREATE INDEX idx_tickets_estado      ON tickets(estado);
CREATE INDEX idx_tickets_prioridad   ON tickets(prioridad);
-- Indice parcial: solo tickets activos (los mas consultados en el tablero).
CREATE INDEX idx_tickets_activos     ON tickets(estado, prioridad)
    WHERE archived_at IS NULL;

CREATE INDEX idx_comentarios_ticket  ON comentarios(ticket_id);
CREATE INDEX idx_comentarios_autor   ON comentarios(autor_id);
