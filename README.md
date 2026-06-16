# SGC-UNT — Sistema de Gestión de la Calidad
### Universidad Nacional de Trujillo

Sistema web integral para la gestión de la calidad institucional, orientado a facilitar
la acreditación (SINEACE / ISO 21001) y la mejora continua de procesos académicos y administrativos.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router) + TailwindCSS |
| Backend | Node.js + Express (API REST) |
| Base de datos | PostgreSQL 16+ |
| Automatización | n8n workflows |
| Contenedores | Docker + Docker Compose |
| Reportes | pdf-lib (PDF nativo) |

---

## Módulos del Sistema

| # | Módulo | Descripción |
|---|--------|-------------|
| M1 | Gestión Documental | CRUD + flujo de aprobación + versiones |
| M2 | Mapa de Procesos | Macroprocesos, procesos, subprocesos + árbol interactivo |
| M3 | Acreditación | SINEACE / ISO 21001 + evidencias + semáforos |
| M4 | Auditorías | Programas, ejecución, hallazgos clasificados |
| M5 | CAPA | No conformidades + análisis causa raíz + planes |
| M6 | Riesgos | Matriz 5×5 + planes de mitigación + monitoreo |
| M7 | Indicadores | KPIs + dashboards + alertas automáticas |
| M8 | Satisfacción | Encuestas Likert/NPS + análisis estadístico |

---

## Inicio Rápido

### Prerrequisitos
- Docker Desktop ≥ 24.x
- Docker Compose ≥ 2.x

### Levantar el sistema completo

```bash
# 1. Clonar / descomprimir el proyecto
cd sgc-unt

# 2. Levantar todos los servicios
docker-compose up -d

# 3. Verificar que todo esté corriendo
docker-compose ps
```

### URLs de acceso

| Servicio | URL | Credenciales |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | — |
| **API Backend** | http://localhost:4000/api | — |
| **n8n Workflows** | http://localhost:5678 | admin / n8n_sgc_2024 |
| **PostgreSQL** | localhost:5432 | sgc_user / sgc_pass_2024 |

### Credenciales por defecto del sistema

```
Correo:     admin@unt.edu.pe
Contraseña: Admin1234!
Rol:        Administrador
```

> ⚠️ **Importante:** Cambie las contraseñas por defecto antes de desplegar en producción.

---

## Desarrollo Local (sin Docker)

### 1. Instalar dependencias

```bash
# En la raíz del proyecto
npm install
```

### 2. Configurar base de datos

```bash
cd backend
cp .env.example .env
# Edite .env con su configuración de PostgreSQL local (DB_HOST=localhost)
```

### 3. Crear/resetear base de datos

```bash
# Opción A: Migrar (crear tablas y datos iniciales)
npm run db:migrate

# Opción B: Resetear completamente (borrar y crear de nuevo)
npm run db:reset
```

### 4. Iniciar ambos servicios

```bash
# En la raíz del proyecto (inicia backend y frontend al mismo tiempo)
npm run dev
```

### 5. Iniciar servicios individualmente (opcional)

```bash
# Solo backend
npm run dev:backend

# Solo frontend
npm run dev:frontend
```

---

## Estructura del Proyecto

```
sgc-unt/
├── backend/
│   ├── config/           # DB pool, logger
│   ├── controllers/      # Lógica de negocio (8 módulos)
│   ├── database/         # schema.sql + migrate.js
│   ├── middleware/       # JWT auth, roles
│   ├── routes/           # Rutas REST (8 módulos + auth + usuarios)
│   ├── services/         # Generación de PDF por módulo
│   ├── uploads/          # Archivos subidos (montado en volumen)
│   └── server.js         # Punto de entrada
├── frontend/
│   ├── app/              # Next.js App Router
│   │   ├── dashboard/    # Dashboard principal
│   │   ├── documentos/   # M1 - Gestión Documental
│   │   ├── procesos/     # M2 - Mapa de Procesos
│   │   ├── acreditacion/ # M3 - Acreditación
│   │   ├── auditorias/   # M4 - Auditorías
│   │   ├── acciones/     # M5 - CAPA
│   │   ├── riesgos/      # M6 - Riesgos
│   │   ├── indicadores/  # M7 - Indicadores
│   │   ├── satisfaccion/ # M8 - Satisfacción
│   │   └── usuarios/     # Gestión de usuarios (admin)
│   ├── components/ui/    # Componentes reutilizables
│   └── lib/              # API client, Auth context
├── n8n-workflows/        # Workflows exportados de n8n
│   ├── 01-notificaciones-documentos.json
│   ├── 02-alertas-indicadores.json
│   └── 03-seguimiento-capa-vencimientos.json
└── docker-compose.yml    # Orquestación completa
```

---

## Roles y Permisos

| Rol | Documentos | Procesos | Auditorías | CAPA | Riesgos | Indicadores | Usuarios |
|-----|-----------|---------|-----------|------|---------|------------|---------|
| **admin** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **auditor** | ✅ R/W | ✅ R/W | ✅ Full | ✅ R/W | ✅ R/W | ✅ R/W | ❌ |
| **usuario** | ✅ R/W | ✅ R/W | 👁 Read | ✅ R/W | ✅ R/W | ✅ R/W | ❌ |
| **solo_lectura** | 👁 Read | 👁 Read | 👁 Read | 👁 Read | 👁 Read | 👁 Read | ❌ |

---

## Generación de PDFs

Cada módulo expone un endpoint de descarga PDF:

```
GET /api/documentos/:id/pdf
GET /api/procesos/:id/pdf
GET /api/acreditacion/autoevaluaciones/:id/pdf
GET /api/auditorias/:id/pdf
GET /api/acciones/:id/pdf
GET /api/riesgos/:id/pdf
GET /api/indicadores/:id/pdf
GET /api/satisfaccion/:id/pdf
```

---

## Variables de Entorno (Producción)

```env
# Backend (.env)
DB_PASSWORD=<contraseña_segura>
JWT_SECRET=<secreto_aleatorio_256bits>

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=https://api.sudominio.edu.pe/api
```

---

## Licencia

Sistema desarrollado para uso interno de la **Universidad Nacional de Trujillo**.
