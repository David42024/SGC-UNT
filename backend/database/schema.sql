-- ============================================================
-- SGC-UNT: Sistema de Gestión de la Calidad
-- Universidad Nacional de Trujillo
-- PostgreSQL 16+ — Script autocontenido
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLAS BASE: Usuarios, Roles y Permisos
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(50)  NOT NULL UNIQUE,
    descripcion TEXT,
    activo      BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE roles IS 'Roles del sistema: admin, auditor, usuario, solo_lectura';

-- Tabla de permisos
CREATE TABLE IF NOT EXISTS permisos (
    id          SERIAL PRIMARY KEY,
    codigo      VARCHAR(50)  NOT NULL UNIQUE,
    descripcion TEXT,
    modulo      VARCHAR(30)  NOT NULL,
    activo      BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE permisos IS 'Permisos granulares del sistema por módulo y acción';

-- Tabla intermedia roles-permisos
CREATE TABLE IF NOT EXISTS roles_permisos (
    rol_id      INTEGER      NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permiso_id  INTEGER      NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (rol_id, permiso_id)
);
COMMENT ON TABLE roles_permisos IS 'Asignación de permisos a roles';

INSERT INTO roles (nombre, descripcion) VALUES
  ('admin',         'Administrador con acceso total al sistema'),
  ('auditor',       'Auditor interno con acceso a módulos de auditoría'),
  ('usuario',       'Usuario estándar con acceso a módulos asignados'),
  ('solo_lectura',  'Acceso de solo lectura a reportes y dashboards')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS usuarios (
    id              SERIAL PRIMARY KEY,
    uuid            UUID         NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    nombres         VARCHAR(100) NOT NULL,
    apellidos       VARCHAR(100) NOT NULL,
    correo          VARCHAR(150) NOT NULL UNIQUE,
    contrasena_hash TEXT         NOT NULL,
    rol_id          INTEGER      NOT NULL REFERENCES roles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    area            VARCHAR(100),
    cargo           VARCHAR(100),
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    ultimo_acceso   TIMESTAMPTZ,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por      INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL
);
COMMENT ON TABLE usuarios IS 'Usuarios del sistema SGC-UNT';
CREATE INDEX IF NOT EXISTS idx_usuarios_correo  ON usuarios(correo);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol_id  ON usuarios(rol_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo  ON usuarios(activo);

-- Usuario admin por defecto (password: Admin1234!)
INSERT INTO usuarios (nombres, apellidos, correo, contrasena_hash, rol_id, area, cargo)
VALUES ('Administrador', 'SGC', 'admin@unt.edu.pe',
        crypt('Admin1234!', gen_salt('bf')), 1, 'Oficina de Calidad', 'Administrador del Sistema')
ON CONFLICT DO NOTHING;

-- ============================================================
-- M1: GESTIÓN DOCUMENTAL
-- ============================================================

CREATE TABLE IF NOT EXISTS categorias_documento (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL UNIQUE,
    descripcion     TEXT,
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por      INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL
);
COMMENT ON TABLE categorias_documento IS 'Categorías: política, manual, procedimiento, instructivo, formato';

INSERT INTO categorias_documento (nombre, descripcion) VALUES
  ('Política',      'Documentos de política institucional'),
  ('Manual',        'Manuales del sistema de gestión'),
  ('Procedimiento', 'Procedimientos operativos'),
  ('Instructivo',   'Instructivos de trabajo'),
  ('Formato',       'Formatos y plantillas')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS documentos (
    id               SERIAL PRIMARY KEY,
    uuid             UUID          NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    codigo           VARCHAR(30)   NOT NULL UNIQUE,
    titulo           VARCHAR(255)  NOT NULL,
    descripcion      TEXT,
    categoria_id     INTEGER       NOT NULL REFERENCES categorias_documento(id) ON DELETE RESTRICT,
    version_actual   VARCHAR(10)   NOT NULL DEFAULT '1.0',
    estado           VARCHAR(20)   NOT NULL DEFAULT 'borrador'
                         CHECK (estado IN ('borrador','revision','aprobado','vigente','obsoleto')),
    responsable_id   INTEGER       NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    revisor_id       INTEGER       REFERENCES usuarios(id) ON DELETE SET NULL,
    aprobador_id     INTEGER       REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_emision    DATE,
    fecha_vigencia   DATE,
    fecha_vencimiento DATE,
    archivo_ruta     TEXT,
    proceso_id       INTEGER,  -- FK a procesos (se agrega más abajo con ALTER)
    creado_en        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    actualizado_en   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    creado_por       INTEGER       REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por  INTEGER       REFERENCES usuarios(id) ON DELETE SET NULL
);
COMMENT ON TABLE documentos IS 'Repositorio central de documentos del SGC';
CREATE INDEX IF NOT EXISTS idx_documentos_estado       ON documentos(estado);
CREATE INDEX IF NOT EXISTS idx_documentos_categoria_id ON documentos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_documentos_responsable  ON documentos(responsable_id);
CREATE INDEX IF NOT EXISTS idx_documentos_codigo       ON documentos(codigo);

CREATE TABLE IF NOT EXISTS versiones_documento (
    id              SERIAL PRIMARY KEY,
    documento_id    INTEGER      NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
    version         VARCHAR(10)  NOT NULL,
    descripcion_cambio TEXT      NOT NULL,
    archivo_ruta    TEXT,
    estado          VARCHAR(20)  NOT NULL DEFAULT 'borrador'
                        CHECK (estado IN ('borrador','revision','aprobado','vigente','obsoleto')),
    fecha_version   DATE         NOT NULL DEFAULT CURRENT_DATE,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por      INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    UNIQUE(documento_id, version)
);
COMMENT ON TABLE versiones_documento IS 'Historial de versiones de cada documento';
CREATE INDEX IF NOT EXISTS idx_versiones_documento_id ON versiones_documento(documento_id);

CREATE TABLE IF NOT EXISTS flujo_aprobacion_documento (
    id              SERIAL PRIMARY KEY,
    documento_id    INTEGER      NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
    version_id      INTEGER      REFERENCES versiones_documento(id) ON DELETE SET NULL,
    accion          VARCHAR(20)  NOT NULL
                        CHECK (accion IN ('enviar_revision','aprobar','rechazar','publicar','obsoleter')),
    estado_anterior VARCHAR(20),
    estado_nuevo    VARCHAR(20),
    comentario      TEXT,
    usuario_id      INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    fecha_accion    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por      INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL
);
COMMENT ON TABLE flujo_aprobacion_documento IS 'Trazabilidad del flujo de aprobación documental';
CREATE INDEX IF NOT EXISTS idx_flujo_doc_id ON flujo_aprobacion_documento(documento_id);

-- ============================================================
-- M2: MAPA DE PROCESOS Y FLUJOS DE TRABAJO
-- ============================================================

CREATE TABLE IF NOT EXISTS tipos_proceso (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(50) NOT NULL UNIQUE,
    descripcion     TEXT,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    creado_por      INTEGER     REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por INTEGER     REFERENCES usuarios(id) ON DELETE SET NULL
);
INSERT INTO tipos_proceso (nombre, descripcion) VALUES
  ('Estratégico',   'Procesos de dirección y planificación'),
  ('Misional',      'Procesos académicos y de investigación'),
  ('Soporte',       'Procesos administrativos y de apoyo')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS procesos (
    id               SERIAL PRIMARY KEY,
    uuid             UUID          NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    codigo           VARCHAR(20)   NOT NULL UNIQUE,
    nombre           VARCHAR(200)  NOT NULL,
    descripcion      TEXT,
    tipo_id          INTEGER       NOT NULL REFERENCES tipos_proceso(id) ON DELETE RESTRICT,
    proceso_padre_id INTEGER       REFERENCES procesos(id) ON DELETE SET NULL,
    nivel            VARCHAR(20)   NOT NULL DEFAULT 'proceso'
                         CHECK (nivel IN ('macroproceso','proceso','subproceso')),
    responsable_id   INTEGER       NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    objetivo         TEXT,
    alcance          TEXT,
    entradas         TEXT,
    salidas          TEXT,
    recursos         TEXT,
    indicadores_clave TEXT,
    activo           BOOLEAN       NOT NULL DEFAULT TRUE,
    creado_en        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    actualizado_en   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    creado_por       INTEGER       REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por  INTEGER       REFERENCES usuarios(id) ON DELETE SET NULL
);
COMMENT ON TABLE procesos IS 'Mapa de procesos institucionales (macro, proceso, sub)';
CREATE INDEX IF NOT EXISTS idx_procesos_padre_id  ON procesos(proceso_padre_id);
CREATE INDEX IF NOT EXISTS idx_procesos_tipo_id   ON procesos(tipo_id);
CREATE INDEX IF NOT EXISTS idx_procesos_nivel      ON procesos(nivel);

-- FK diferida: documentos → procesos
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_documentos_proceso') THEN
        ALTER TABLE documentos ADD CONSTRAINT fk_documentos_proceso
            FOREIGN KEY (proceso_id) REFERENCES procesos(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS actividades_proceso (
    id              SERIAL PRIMARY KEY,
    proceso_id      INTEGER      NOT NULL REFERENCES procesos(id) ON DELETE CASCADE,
    orden           INTEGER      NOT NULL DEFAULT 1,
    nombre          VARCHAR(200) NOT NULL,
    descripcion     TEXT,
    responsable_id  INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    tipo_actividad  VARCHAR(30)  DEFAULT 'tarea'
                        CHECK (tipo_actividad IN ('inicio','tarea','decision','fin')),
    duracion_estimada_dias INTEGER,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por      INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL
);
COMMENT ON TABLE actividades_proceso IS 'Actividades/pasos de cada proceso';
CREATE INDEX IF NOT EXISTS idx_actividades_proceso_id ON actividades_proceso(proceso_id);

-- ============================================================
-- M3: ACREDITACIÓN Y AUTOEVALUACIÓN
-- ============================================================

CREATE TABLE IF NOT EXISTS modelos_acreditacion (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL UNIQUE,
    descripcion     TEXT,
    entidad         VARCHAR(100),   -- SINEACE, ISO, etc.
    version         VARCHAR(20),
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por      INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL
);
INSERT INTO modelos_acreditacion (nombre, entidad, version) VALUES
  ('SINEACE 2023', 'SINEACE', '2023'),
  ('ISO 21001:2018', 'ISO', '2018')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS estandares_acreditacion (
    id              SERIAL PRIMARY KEY,
    modelo_id       INTEGER      NOT NULL REFERENCES modelos_acreditacion(id) ON DELETE CASCADE,
    padre_id        INTEGER      REFERENCES estandares_acreditacion(id) ON DELETE SET NULL,
    codigo          VARCHAR(20)  NOT NULL,
    nombre          VARCHAR(255) NOT NULL,
    descripcion     TEXT,
    nivel           VARCHAR(20)  NOT NULL DEFAULT 'criterio'
                        CHECK (nivel IN ('dimension','factor','estandar','criterio')),
    peso_ponderacion NUMERIC(5,2) DEFAULT 1.00,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por      INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    UNIQUE(modelo_id, codigo)
);
CREATE INDEX IF NOT EXISTS idx_estandares_modelo_id ON estandares_acreditacion(modelo_id);
CREATE INDEX IF NOT EXISTS idx_estandares_padre_id  ON estandares_acreditacion(padre_id);

CREATE TABLE IF NOT EXISTS autoevaluaciones (
    id              SERIAL PRIMARY KEY,
    modelo_id       INTEGER      NOT NULL REFERENCES modelos_acreditacion(id) ON DELETE RESTRICT,
    nombre          VARCHAR(200) NOT NULL,
    descripcion     TEXT,
    periodo         VARCHAR(20),
    estado          VARCHAR(20)  NOT NULL DEFAULT 'en_proceso'
                        CHECK (estado IN ('en_proceso','finalizado','enviado')),
    fecha_inicio    DATE,
    fecha_fin       DATE,
    responsable_id  INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por      INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_autoevaluaciones_modelo_id ON autoevaluaciones(modelo_id);

CREATE TABLE IF NOT EXISTS evidencias_acreditacion (
    id                SERIAL PRIMARY KEY,
    autoevaluacion_id INTEGER      NOT NULL REFERENCES autoevaluaciones(id) ON DELETE CASCADE,
    estandar_id       INTEGER      NOT NULL REFERENCES estandares_acreditacion(id) ON DELETE CASCADE,
    descripcion       TEXT         NOT NULL,
    tipo_evidencia    VARCHAR(50)  DEFAULT 'documento',
    archivo_ruta      TEXT,
    url_referencia    TEXT,
    estado_cumplimiento VARCHAR(20) NOT NULL DEFAULT 'no_iniciado'
                          CHECK (estado_cumplimiento IN ('no_iniciado','en_proceso','cumplido','no_cumplido')),
    porcentaje_cumplimiento NUMERIC(5,2) DEFAULT 0.00
                              CHECK (porcentaje_cumplimiento BETWEEN 0 AND 100),
    observaciones     TEXT,
    responsable_id    INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por        INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por   INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_evidencias_autoevaluacion ON evidencias_acreditacion(autoevaluacion_id);
CREATE INDEX IF NOT EXISTS idx_evidencias_estandar       ON evidencias_acreditacion(estandar_id);

-- ============================================================
-- M4: AUDITORÍAS E INSPECCIONES
-- ============================================================

CREATE TABLE IF NOT EXISTS programas_auditoria (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(200) NOT NULL,
    descripcion     TEXT,
    año             INTEGER      NOT NULL,
    estado          VARCHAR(20)  NOT NULL DEFAULT 'planificado'
                        CHECK (estado IN ('planificado','en_curso','finalizado','cancelado')),
    responsable_id  INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por      INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS auditorias (
    id                  SERIAL PRIMARY KEY,
    uuid                UUID          NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    programa_id         INTEGER       REFERENCES programas_auditoria(id) ON DELETE SET NULL,
    codigo              VARCHAR(20)   NOT NULL UNIQUE,
    titulo              VARCHAR(200)  NOT NULL,
    tipo_auditoria      VARCHAR(30)   NOT NULL DEFAULT 'interna'
                            CHECK (tipo_auditoria IN ('interna','externa','seguimiento')),
    alcance             TEXT,
    objetivo            TEXT,
    proceso_id          INTEGER       REFERENCES procesos(id) ON DELETE SET NULL,
    auditor_lider_id    INTEGER       NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    fecha_planificada   DATE,
    fecha_inicio        DATE,
    fecha_fin           DATE,
    estado              VARCHAR(20)   NOT NULL DEFAULT 'planificado'
                            CHECK (estado IN ('planificado','en_curso','finalizado','cancelado')),
    conclusion_general  TEXT,
    creado_en           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    creado_por          INTEGER       REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por     INTEGER       REFERENCES usuarios(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_auditorias_estado      ON auditorias(estado);
CREATE INDEX IF NOT EXISTS idx_auditorias_programa_id ON auditorias(programa_id);

CREATE TABLE IF NOT EXISTS auditores_auditoria (
    id           SERIAL PRIMARY KEY,
    auditoria_id INTEGER NOT NULL REFERENCES auditorias(id) ON DELETE CASCADE,
    usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    rol_auditoria VARCHAR(30) DEFAULT 'auditor',
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    creado_por   INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    UNIQUE(auditoria_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS hallazgos_auditoria (
    id              SERIAL PRIMARY KEY,
    uuid            UUID         NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    auditoria_id    INTEGER      NOT NULL REFERENCES auditorias(id) ON DELETE CASCADE,
    codigo          VARCHAR(30)  NOT NULL,
    descripcion     TEXT         NOT NULL,
    clasificacion   VARCHAR(30)  NOT NULL DEFAULT 'observacion'
                        CHECK (clasificacion IN ('conforme','no_conformidad_menor','no_conformidad_mayor','observacion','oportunidad_mejora')),
    proceso_id      INTEGER      REFERENCES procesos(id) ON DELETE SET NULL,
    estandar_ref    VARCHAR(100),
    evidencia_objetiva TEXT,
    archivo_ruta    TEXT,
    estado          VARCHAR(20)  NOT NULL DEFAULT 'abierto'
                        CHECK (estado IN ('abierto','en_proceso','cerrado','verificado')),
    responsable_id  INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_limite    DATE,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por      INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_hallazgos_auditoria_id   ON hallazgos_auditoria(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_hallazgos_clasificacion  ON hallazgos_auditoria(clasificacion);
CREATE INDEX IF NOT EXISTS idx_hallazgos_estado         ON hallazgos_auditoria(estado);

-- ============================================================
-- M5: ACCIONES CORRECTIVAS Y PREVENTIVAS (CAPA)
-- ============================================================

CREATE TABLE IF NOT EXISTS no_conformidades (
    id               SERIAL PRIMARY KEY,
    uuid             UUID          NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    codigo           VARCHAR(20)   NOT NULL UNIQUE,
    titulo           VARCHAR(255)  NOT NULL,
    descripcion      TEXT          NOT NULL,
    tipo             VARCHAR(20)   NOT NULL DEFAULT 'correctiva'
                         CHECK (tipo IN ('correctiva','preventiva','mejora')),
    origen           VARCHAR(50)   DEFAULT 'auditoria'
                         CHECK (origen IN ('auditoria','queja','revision','autoevaluacion','otro')),
    proceso_id       INTEGER       REFERENCES procesos(id) ON DELETE SET NULL,
    hallazgo_id      INTEGER       REFERENCES hallazgos_auditoria(id) ON DELETE SET NULL,
    responsable_id   INTEGER       NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    estado           VARCHAR(20)   NOT NULL DEFAULT 'abierto'
                         CHECK (estado IN ('abierto','en_proceso','verificado','cerrado')),
    fecha_deteccion  DATE          NOT NULL DEFAULT CURRENT_DATE,
    fecha_limite     DATE,
    fecha_cierre     DATE,
    impacto          VARCHAR(10)   DEFAULT 'medio'
                         CHECK (impacto IN ('bajo','medio','alto','critico')),
    fecha_verificacion DATE,
    efectividad      VARCHAR(20)
                         CHECK (efectividad IN ('si','parcial','no')),
    evidencia_url    TEXT,
    observaciones_verificacion TEXT,
    creado_en        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    actualizado_en   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    creado_por       INTEGER       REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por  INTEGER       REFERENCES usuarios(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_no_conformidades_estado ON no_conformidades(estado);
CREATE INDEX IF NOT EXISTS idx_no_conformidades_tipo   ON no_conformidades(tipo);

CREATE TABLE IF NOT EXISTS analisis_causa_raiz (
    id                  SERIAL PRIMARY KEY,
    no_conformidad_id   INTEGER      NOT NULL REFERENCES no_conformidades(id) ON DELETE CASCADE,
    metodo              VARCHAR(20)  NOT NULL DEFAULT '5_porques'
                            CHECK (metodo IN ('5_porques','ishikawa','otro')),
    descripcion_problema TEXT         NOT NULL,
    causa_raiz          TEXT,
    factores_causales   JSONB,        -- Para Ishikawa: {maquina:[], mano_obra:[], etc.}
    porques             JSONB,        -- Para 5 porqués: [{orden:1, porque:"..."}, ...]
    creado_en           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por          INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por     INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS planes_accion_capa (
    id                  SERIAL PRIMARY KEY,
    no_conformidad_id   INTEGER      NOT NULL REFERENCES no_conformidades(id) ON DELETE CASCADE,
    actividad           TEXT         NOT NULL,
    responsable_id      INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    fecha_inicio        DATE,
    fecha_limite        DATE         NOT NULL,
    fecha_cierre        DATE,
    estado              VARCHAR(20)  NOT NULL DEFAULT 'pendiente'
                            CHECK (estado IN ('pendiente','en_proceso','completado','cancelado')),
    evidencia_cierre    TEXT,
    archivo_ruta        TEXT,
    orden               INTEGER      DEFAULT 1,
    creado_en           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por          INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por     INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_planes_no_conformidad_id ON planes_accion_capa(no_conformidad_id);

-- ============================================================
-- M6: GESTIÓN DE RIESGOS
-- ============================================================

CREATE TABLE IF NOT EXISTS categorias_riesgo (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL UNIQUE,
    descripcion     TEXT,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por      INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL
);
INSERT INTO categorias_riesgo (nombre, descripcion) VALUES
  ('Estratégico',    'Riesgos que afectan los objetivos institucionales'),
  ('Operacional',    'Riesgos en la ejecución de procesos'),
  ('Tecnológico',    'Riesgos asociados a sistemas e infraestructura TI'),
  ('Reputacional',   'Riesgos que afectan la imagen institucional'),
  ('Financiero',     'Riesgos económicos y presupuestales'),
  ('Legal',          'Riesgos normativos y de cumplimiento')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS riesgos (
    id               SERIAL PRIMARY KEY,
    uuid             UUID          NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    codigo           VARCHAR(20)   NOT NULL UNIQUE,
    nombre           VARCHAR(255)  NOT NULL,
    descripcion      TEXT,
    categoria_id     INTEGER       NOT NULL REFERENCES categorias_riesgo(id) ON DELETE RESTRICT,
    proceso_id       INTEGER       REFERENCES procesos(id) ON DELETE SET NULL,
    responsable_id   INTEGER       NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    tipo_riesgo      VARCHAR(20)   NOT NULL DEFAULT 'negativo'
                         CHECK (tipo_riesgo IN ('negativo','positivo')),
    probabilidad     INTEGER       NOT NULL CHECK (probabilidad BETWEEN 1 AND 5),
    impacto          INTEGER       NOT NULL CHECK (impacto BETWEEN 1 AND 5),
    nivel_riesgo     INTEGER       GENERATED ALWAYS AS (probabilidad * impacto) STORED,
    clasificacion_nivel VARCHAR(10) NOT NULL DEFAULT 'moderado'
                           CHECK (clasificacion_nivel IN ('bajo','moderado','alto','critico')),
    estado           VARCHAR(20)   NOT NULL DEFAULT 'identificado'
                         CHECK (estado IN ('identificado','en_tratamiento','aceptado','cerrado')),
    fecha_identificacion DATE      NOT NULL DEFAULT CURRENT_DATE,
    descripcion_control_actual TEXT,
    creado_en        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    actualizado_en   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    creado_por       INTEGER       REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por  INTEGER       REFERENCES usuarios(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_riesgos_categoria_id ON riesgos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_riesgos_estado        ON riesgos(estado);
CREATE INDEX IF NOT EXISTS idx_riesgos_proceso_id    ON riesgos(proceso_id);

CREATE TABLE IF NOT EXISTS planes_mitigacion_riesgo (
    id              SERIAL PRIMARY KEY,
    riesgo_id       INTEGER      NOT NULL REFERENCES riesgos(id) ON DELETE CASCADE,
    estrategia      VARCHAR(20)  NOT NULL DEFAULT 'mitigar'
                        CHECK (estrategia IN ('mitigar','aceptar','transferir','evitar','explotar')),
    accion          TEXT         NOT NULL,
    responsable_id  INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    fecha_inicio    DATE,
    fecha_limite    DATE,
    estado          VARCHAR(20)  NOT NULL DEFAULT 'pendiente'
                        CHECK (estado IN ('pendiente','en_proceso','completado','cancelado')),
    probabilidad_residual INTEGER CHECK (probabilidad_residual BETWEEN 1 AND 5),
    impacto_residual      INTEGER CHECK (impacto_residual BETWEEN 1 AND 5),
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por      INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_planes_mitg_riesgo_id ON planes_mitigacion_riesgo(riesgo_id);

CREATE TABLE IF NOT EXISTS monitoreo_riesgos (
    id              SERIAL PRIMARY KEY,
    riesgo_id       INTEGER      NOT NULL REFERENCES riesgos(id) ON DELETE CASCADE,
    fecha_monitoreo DATE         NOT NULL DEFAULT CURRENT_DATE,
    probabilidad    INTEGER      NOT NULL CHECK (probabilidad BETWEEN 1 AND 5),
    impacto         INTEGER      NOT NULL CHECK (impacto BETWEEN 1 AND 5),
    observaciones   TEXT,
    revisor_id      INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por      INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ============================================================
-- M7: INDICADORES DE GESTIÓN (DASHBOARDS)
-- ============================================================

CREATE TABLE IF NOT EXISTS indicadores (
    id              SERIAL PRIMARY KEY,
    uuid            UUID          NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    codigo          VARCHAR(20)   NOT NULL UNIQUE,
    nombre          VARCHAR(255)  NOT NULL,
    descripcion     TEXT,
    modulo          VARCHAR(30)   NOT NULL
                        CHECK (modulo IN ('documentos','procesos','acreditacion','auditorias',
                                          'acciones','riesgos','indicadores','satisfaccion','general')),
    tipo            VARCHAR(20)   NOT NULL DEFAULT 'porcentaje'
                        CHECK (tipo IN ('porcentaje','numero','ratio','tiempo','costo')),
    formula         TEXT,
    unidad_medida   VARCHAR(30),
    meta            NUMERIC(12,4),
    umbral_alerta   NUMERIC(12,4),
    umbral_critico  NUMERIC(12,4),
    frecuencia_medicion VARCHAR(20) DEFAULT 'mensual'
                           CHECK (frecuencia_medicion IN ('diaria','semanal','mensual','trimestral','anual')),
    responsable_id  INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por      INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_indicadores_modulo  ON indicadores(modulo);
CREATE INDEX IF NOT EXISTS idx_indicadores_activo  ON indicadores(activo);

CREATE TABLE IF NOT EXISTS mediciones_indicador (
    id              SERIAL PRIMARY KEY,
    indicador_id    INTEGER      NOT NULL REFERENCES indicadores(id) ON DELETE CASCADE,
    periodo         VARCHAR(20)  NOT NULL,
    valor           NUMERIC(12,4) NOT NULL,
    meta_periodo    NUMERIC(12,4),
    estado_semaforo VARCHAR(10)  NOT NULL DEFAULT 'verde'
                        CHECK (estado_semaforo IN ('verde','amarillo','rojo')),
    fuente_datos    TEXT,
    observaciones   TEXT,
    fecha_medicion  DATE         NOT NULL DEFAULT CURRENT_DATE,
    aprobado_por    INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    parametros      JSONB,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por      INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_mediciones_indicador_id ON mediciones_indicador(indicador_id);
CREATE INDEX IF NOT EXISTS idx_mediciones_periodo      ON mediciones_indicador(periodo);

CREATE TABLE IF NOT EXISTS parametros_indicador (
    id              SERIAL PRIMARY KEY,
    indicador_id    INTEGER      NOT NULL REFERENCES indicadores(id) ON DELETE CASCADE,
    nombre          VARCHAR(100) NOT NULL,
    etiqueta        VARCHAR(255) NOT NULL,
    orden           INTEGER      NOT NULL DEFAULT 1,
    tipo            VARCHAR(20)  NOT NULL DEFAULT 'numero'
                        CHECK (tipo IN ('numero','texto','fecha')),
    obligatorio     BOOLEAN      NOT NULL DEFAULT TRUE,
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(indicador_id, nombre)
);
CREATE INDEX IF NOT EXISTS idx_parametros_indicador_id ON parametros_indicador(indicador_id);

CREATE TABLE IF NOT EXISTS alertas_indicador (
    id              SERIAL PRIMARY KEY,
    indicador_id    INTEGER      NOT NULL REFERENCES indicadores(id) ON DELETE CASCADE,
    medicion_id     INTEGER      REFERENCES mediciones_indicador(id) ON DELETE SET NULL,
    tipo_alerta     VARCHAR(20)  NOT NULL DEFAULT 'bajo_umbral'
                        CHECK (tipo_alerta IN ('bajo_umbral','critico','meta_alcanzada')),
    mensaje         TEXT         NOT NULL,
    enviada         BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha_alerta    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por      INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ============================================================
-- M8: GESTIÓN DE LA SATISFACCIÓN
-- ============================================================

CREATE TABLE IF NOT EXISTS encuestas (
    id              SERIAL PRIMARY KEY,
    uuid            UUID          NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    titulo          VARCHAR(255)  NOT NULL,
    descripcion     TEXT,
    tipo_publico    VARCHAR(20)   NOT NULL DEFAULT 'estudiante'
                        CHECK (tipo_publico IN ('estudiante','docente','egresado','administrativo','todos')),
    estado          VARCHAR(20)   NOT NULL DEFAULT 'borrador'
                        CHECK (estado IN ('borrador','publicada','cerrada')),
    fecha_inicio    DATE,
    fecha_cierre    DATE,
    anonima         BOOLEAN      NOT NULL DEFAULT TRUE,
    responsable_id  INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    total_respuestas INTEGER     NOT NULL DEFAULT 0,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por      INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_encuestas_estado       ON encuestas(estado);
CREATE INDEX IF NOT EXISTS idx_encuestas_tipo_publico ON encuestas(tipo_publico);

CREATE TABLE IF NOT EXISTS preguntas_encuesta (
    id              SERIAL PRIMARY KEY,
    encuesta_id     INTEGER      NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
    orden           INTEGER      NOT NULL DEFAULT 1,
    texto           TEXT         NOT NULL,
    tipo_pregunta   VARCHAR(20)  NOT NULL DEFAULT 'likert'
                        CHECK (tipo_pregunta IN ('likert','opcion_multiple','texto_abierto','nps','si_no')),
    obligatoria     BOOLEAN      NOT NULL DEFAULT TRUE,
    opciones        JSONB,        -- Para opción múltiple: ["Opción A", "Opción B", ...]
    escala_min      INTEGER      DEFAULT 1,
    escala_max      INTEGER      DEFAULT 5,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por      INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_preguntas_encuesta_id ON preguntas_encuesta(encuesta_id);

CREATE TABLE IF NOT EXISTS respuestas_encuesta (
    id              SERIAL PRIMARY KEY,
    encuesta_id     INTEGER      NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
    token_respuesta UUID         NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    respondente_id  INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    tipo_respondente VARCHAR(20) DEFAULT 'estudiante',
    ip_origen       INET,
    fecha_respuesta TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completada      BOOLEAN      NOT NULL DEFAULT FALSE,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por      INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_respuestas_encuesta_id ON respuestas_encuesta(encuesta_id);

CREATE TABLE IF NOT EXISTS detalle_respuestas (
    id                  SERIAL PRIMARY KEY,
    respuesta_id        INTEGER      NOT NULL REFERENCES respuestas_encuesta(id) ON DELETE CASCADE,
    pregunta_id         INTEGER      NOT NULL REFERENCES preguntas_encuesta(id) ON DELETE CASCADE,
    valor_numerico      NUMERIC(5,2),
    valor_texto         TEXT,
    valor_opcion        VARCHAR(200),
    creado_en           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por          INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por     INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_detalle_respuesta_id ON detalle_respuestas(respuesta_id);
CREATE INDEX IF NOT EXISTS idx_detalle_pregunta_id  ON detalle_respuestas(pregunta_id);

-- ============================================================
-- TRIGGER: actualizar actualizado_en automáticamente
-- ============================================================

CREATE OR REPLACE FUNCTION actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    tbl TEXT;
    tablas TEXT[] := ARRAY[
        'roles','usuarios','categorias_documento','documentos','versiones_documento',
        'flujo_aprobacion_documento','tipos_proceso','procesos','actividades_proceso',
        'modelos_acreditacion','estandares_acreditacion','autoevaluaciones','evidencias_acreditacion',
        'programas_auditoria','auditorias','auditores_auditoria','hallazgos_auditoria',
        'no_conformidades','analisis_causa_raiz','planes_accion_capa',
        'categorias_riesgo','riesgos','planes_mitigacion_riesgo','monitoreo_riesgos',
        'indicadores','mediciones_indicador','alertas_indicador',
        'encuestas','preguntas_encuesta','respuestas_encuesta','detalle_respuestas'
    ];
BEGIN
    FOREACH tbl IN ARRAY tablas LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_actualizar_%1$s ON %1$s;
            CREATE TRIGGER trg_actualizar_%1$s
            BEFORE UPDATE ON %1$s
            FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();
        ', tbl);
    END LOOP;
END;
$$;

-- ============================================================
-- DATOS DE MUESTRA
-- ============================================================

-- Procesos de muestra
INSERT INTO procesos (codigo, nombre, descripcion, tipo_id, nivel, responsable_id, objetivo, entradas, salidas)
VALUES
  ('MAC-001', 'Gestión Estratégica', 'Macroproceso de dirección institucional', 1, 'macroproceso', 1, 'Definir y ejecutar el plan estratégico', 'Plan estratégico anterior', 'Plan estratégico aprobado'),
  ('MAC-002', 'Formación Académica', 'Macroproceso de enseñanza-aprendizaje', 2, 'macroproceso', 1, 'Formar profesionales de calidad', 'Estudiantes admitidos', 'Profesionales egresados')
ON CONFLICT DO NOTHING;

-- ============================================================
-- INDICADORES REALES UNT (DP-OC-001, Versión 02)
-- ============================================================

-- OEI.01: Calidad de formación de egresados
INSERT INTO indicadores (codigo, nombre, descripcion, modulo, tipo, formula, unidad_medida, meta, umbral_alerta, umbral_critico, frecuencia_medicion, responsable_id, activo) VALUES
  ('IND-OEI01-01', 'Objetivo Educacional Óptimo', 'Porcentaje de egresados que obtienen un nivel óptimo de logro de los objetivos educacionales', 'general', 'porcentaje', '(N° de egresados que cumplen con el Nivel Óptimo de los Objetivos Educacionales / N° Total de Estudiantes Egresados) × 100', '%', 85.00, 70.00, 50.00, 'anual', 1, TRUE),
  ('IND-OEI01-02', 'Inserción Laboral General', 'Porcentaje de egresados que se encuentran laborando actualmente según carrera profesional', 'general', 'porcentaje', '(N° de Egresados que se encuentran laborando actualmente según su Carrera Profesional / N° Total de Egresados) × 100', '%', 80.00, 60.00, 40.00, 'anual', 1, TRUE),
  ('IND-OEI01-03', 'Inserción Laboral Acorde al Perfil', 'Porcentaje de egresados que se encuentran laborando de acuerdo a su formación profesional, su perfil, cargo que ocupa, remunerado acorde al mercado nacional', 'general', 'porcentaje', '(N° de Egresados que se encuentran laborando de acuerdo a su formación profesional, su perfil, cargo que ocupa, y remunerado de acuerdo al mercado nacional / N° Total de Egresados por promoción) × 100', '%', 75.00, 55.00, 35.00, 'anual', 1, TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- OEI.02: Investigación, patentes y emprendimiento
INSERT INTO indicadores (codigo, nombre, descripcion, modulo, tipo, formula, unidad_medida, meta, umbral_alerta, umbral_critico, frecuencia_medicion, responsable_id, activo) VALUES
  ('IND-OEI02-01', 'Publicaciones de Alto Impacto', 'Porcentaje de publicaciones académicas en revistas de alto impacto', 'general', 'porcentaje', '(N° Total de publicaciones académicas en revistas de alto impacto / N° Total de Publicaciones académicas desarrolladas) × 100', '%', 30.00, 20.00, 10.00, 'anual', 1, TRUE),
  ('IND-OEI02-02', 'Patentes Registradas', 'Porcentaje de patentes registradas', 'general', 'porcentaje', '(N° Total de patentes registradas / N° Total de Patentes propuestas) × 100', '%', 60.00, 40.00, 20.00, 'anual', 1, TRUE),
  ('IND-OEI02-03', 'Nuevos Emprendimientos', 'Porcentaje de nuevos emprendimientos registrados', 'general', 'porcentaje', '(N° Total de Emprendimientos nuevos Registrados / N° Total de Emprendimientos nuevos planteados) × 100', '%', 70.00, 50.00, 30.00, 'anual', 1, TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- OEI.03: Extensión cultural y responsabilidad social
INSERT INTO indicadores (codigo, nombre, descripcion, modulo, tipo, formula, unidad_medida, meta, umbral_alerta, umbral_critico, frecuencia_medicion, responsable_id, activo) VALUES
  ('IND-OEI03-01', 'Proyectos Implementados', 'Porcentaje de proyectos de extensión cultural, proyección y responsabilidad social y ambiental en la comunidad universitaria y sociedad implementados', 'general', 'porcentaje', '(N° Total de Proyectos de Extensión Cultural, proyección y Responsabilidad Social y ambiental implementados / N° Total de Proyectos de Extensión Cultural, proyección y Responsabilidad Social y ambiental programados) × 100', '%', 90.00, 75.00, 50.00, 'anual', 1, TRUE),
  ('IND-OEI03-02', 'Proyectos Evaluados', 'Porcentaje de proyectos de extensión cultural, proyección y responsabilidad social y ambiental en la comunidad universitaria y sociedad evaluados', 'general', 'porcentaje', '(N° Total de Proyectos de Extensión Cultural, proyección y Responsabilidad Social y ambiental evaluados / N° Total de Proyectos de Extensión Cultural, proyección y Responsabilidad Social y ambiental programados) × 100', '%', 95.00, 80.00, 60.00, 'anual', 1, TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- OEI.04: Gobernanza institucional y presupuesto
INSERT INTO indicadores (codigo, nombre, descripcion, modulo, tipo, formula, unidad_medida, meta, umbral_alerta, umbral_critico, frecuencia_medicion, responsable_id, activo) VALUES
  ('IND-OEI04-01', 'Eficacia del PEI', 'Eficacia del PEI en relación al cumplimiento de los objetivos estratégicos institucionales', 'general', 'porcentaje', '(N° total de objetivos estratégicos institucionales logrados / N° Total de objetivos estratégicos institucionales planteados) × 100', '%', 90.00, 75.00, 50.00, 'anual', 1, TRUE),
  ('IND-OEI04-02', 'Ejecución del Presupuesto', 'Porcentaje de ejecución del presupuesto Institucional', 'general', 'porcentaje', '(Monto Total del Girado del presupuesto institucional / Monto Total del PIM) × 100', '%', 95.00, 85.00, 70.00, 'anual', 1, TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- OEI.05: Gestión de riesgos y continuidad operativa
INSERT INTO indicadores (codigo, nombre, descripcion, modulo, tipo, formula, unidad_medida, meta, umbral_alerta, umbral_critico, frecuencia_medicion, responsable_id, activo) VALUES
  ('IND-OEI05-01', 'Gestión de Riesgos y Continuidad', 'Porcentaje de avance en la implementación del Sistema de Gestión de riesgos y continuidad operativa institucional', 'general', 'porcentaje', '(N° Total de Acciones Ejecutadas para la Implementación del Sistema de Gestión de Riesgos y Continuidad Operativa / N° Total de Acciones Programadas para la Implementación del Sistema de Gestión de Riesgos y Continuidad Operativa) × 100', '%', 100.00, 80.00, 60.00, 'trimestral', 1, TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- OC.01: Satisfacción de estudiantes
INSERT INTO indicadores (codigo, nombre, descripcion, modulo, tipo, formula, unidad_medida, meta, umbral_alerta, umbral_critico, frecuencia_medicion, responsable_id, activo) VALUES
  ('IND-OC01-01', 'Satisfacción Estudiantil', 'Porcentaje de estudiantes satisfechos con los servicios brindados por la UNT', 'satisfaccion', 'porcentaje', '(Número de estudiantes satisfechos y muy satisfechos con los servicios brindados por la Universidad Nacional de Trujillo / Número total de estudiantes encuestados) × 100', '%', 85.00, 70.00, 50.00, 'trimestral', 1, TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- Parámetros de indicadores
INSERT INTO parametros_indicador (indicador_id, nombre, etiqueta, orden, tipo, obligatorio) VALUES
  -- IND-OEI04-01: Eficacia del PEI
  ((SELECT id FROM indicadores WHERE codigo='IND-OEI04-01'), 'objetivos_logrados', 'N° total de objetivos estratégicos institucionales logrados', 1, 'numero', TRUE),
  ((SELECT id FROM indicadores WHERE codigo='IND-OEI04-01'), 'objetivos_planteados', 'N° Total de objetivos estratégicos institucionales planteados', 2, 'numero', TRUE),
  -- IND-OEI04-02: Ejecución del Presupuesto
  ((SELECT id FROM indicadores WHERE codigo='IND-OEI04-02'), 'monto_girado', 'Monto Total del Girado del presupuesto institucional', 1, 'numero', TRUE),
  ((SELECT id FROM indicadores WHERE codigo='IND-OEI04-02'), 'monto_pim', 'Monto Total del PIM', 2, 'numero', TRUE),
  -- IND-OEI01-01: Objetivo Educacional Óptimo
  ((SELECT id FROM indicadores WHERE codigo='IND-OEI01-01'), 'egresados_cumplen', 'N° de egresados que cumplen con el Nivel Óptimo de los Objetivos Educacionales', 1, 'numero', TRUE),
  ((SELECT id FROM indicadores WHERE codigo='IND-OEI01-01'), 'total_egresados', 'N° Total de Estudiantes Egresados', 2, 'numero', TRUE),
  -- IND-OEI01-02: Inserción Laboral General
  ((SELECT id FROM indicadores WHERE codigo='IND-OEI01-02'), 'egresados_laborando', 'N° de Egresados que se encuentran laborando actualmente según su Carrera Profesional', 1, 'numero', TRUE),
  ((SELECT id FROM indicadores WHERE codigo='IND-OEI01-02'), 'total_egresados', 'N° Total de Egresados', 2, 'numero', TRUE),
  -- IND-OEI01-03: Inserción Laboral Acorde al Perfil
  ((SELECT id FROM indicadores WHERE codigo='IND-OEI01-03'), 'egresados_acorde', 'N° de Egresados que se encuentran laborando de acuerdo a su formación profesional, su perfil, cargo que ocupa, y remunerado de acuerdo al mercado nacional', 1, 'numero', TRUE),
  ((SELECT id FROM indicadores WHERE codigo='IND-OEI01-03'), 'total_egresados_promocion', 'N° Total de Egresados por promoción', 2, 'numero', TRUE),
  -- IND-OEI02-01: Publicaciones de Alto Impacto
  ((SELECT id FROM indicadores WHERE codigo='IND-OEI02-01'), 'publicaciones_alto_impacto', 'N° Total de publicaciones académicas en revistas de alto impacto', 1, 'numero', TRUE),
  ((SELECT id FROM indicadores WHERE codigo='IND-OEI02-01'), 'total_publicaciones', 'N° Total de Publicaciones académicas desarrolladas', 2, 'numero', TRUE),
  -- IND-OEI02-02: Patentes Registradas
  ((SELECT id FROM indicadores WHERE codigo='IND-OEI02-02'), 'patentes_registradas', 'N° Total de patentes registradas', 1, 'numero', TRUE),
  ((SELECT id FROM indicadores WHERE codigo='IND-OEI02-02'), 'patentes_propuestas', 'N° Total de Patentes propuestas', 2, 'numero', TRUE),
  -- IND-OEI02-03: Nuevos Emprendimientos
  ((SELECT id FROM indicadores WHERE codigo='IND-OEI02-03'), 'emprendimientos_registrados', 'N° Total de Emprendimientos nuevos Registrados', 1, 'numero', TRUE),
  ((SELECT id FROM indicadores WHERE codigo='IND-OEI02-03'), 'emprendimientos_planteados', 'N° Total de Emprendimientos nuevos planteados', 2, 'numero', TRUE),
  -- IND-OEI03-02: Proyectos Evaluados
  ((SELECT id FROM indicadores WHERE codigo='IND-OEI03-02'), 'proyectos_evaluados', 'N° Total de Proyectos de Extensión Cultural, proyección y Responsabilidad Social y ambiental evaluados', 1, 'numero', TRUE),
  ((SELECT id FROM indicadores WHERE codigo='IND-OEI03-02'), 'proyectos_programados', 'N° Total de Proyectos de Extensión Cultural, proyección y Responsabilidad Social y ambiental programados', 2, 'numero', TRUE),
  -- IND-OEI05-01: Gestión de Riesgos y Continuidad
  ((SELECT id FROM indicadores WHERE codigo='IND-OEI05-01'), 'acciones_ejecutadas', 'N° Total de Acciones Ejecutadas para la Implementación del Sistema de Gestión de Riesgos y Continuidad Operativa', 1, 'numero', TRUE),
  ((SELECT id FROM indicadores WHERE codigo='IND-OEI05-01'), 'acciones_programadas', 'N° Total de Acciones Programadas para la Implementación del Sistema de Gestión de Riesgos y Continuidad Operativa', 2, 'numero', TRUE),
  -- IND-OC01-01: Satisfacción Estudiantil
  ((SELECT id FROM indicadores WHERE codigo='IND-OC01-01'), 'estudiantes_satisfechos', 'Número de estudiantes satisfechos y muy satisfechos con los servicios brindados por la Universidad Nacional de Trujillo', 1, 'numero', TRUE),
  ((SELECT id FROM indicadores WHERE codigo='IND-OC01-01'), 'total_encuestados', 'Número total de estudiantes encuestados', 2, 'numero', TRUE)
ON CONFLICT (indicador_id, nombre) DO NOTHING;

COMMIT;
