asado en el documento oficial de la UNT (código DP-OC-001, versión 02) y la estructura actual del sistema, aquí está la distribución:

Contexto del documento oficial
El PDF define 12 indicadores reales agrupados en 5 objetivos estratégicos:
CódigoObjetivoÁrea responsableOEI.01Calidad de formación de egresadosVicerrectorado AcadémicoOEI.02Investigación, patentes y emprendimientoVicerrectorado de InvestigaciónOEI.03Extensión cultural y responsabilidad socialDir. de Responsabilidad SocialOEI.04Gobernanza institucional y presupuestoOficina de PlaneamientoOC.01Satisfacción de estudiantes con servicios UNTDir. de Procesos Académicos
Estos indicadores ya están precargados en el schema.sql (✅ PARA REVISAR).

Distribución por estudiante
👨‍💻 DAVID — Módulos: Dashboard + Indicadores + Usuarios
Responsabilidad: El cerebro estadístico del sistema y la administración de acceso.
CRUDs a implementar:

Dashboard: ✅ PARA REVISAR - consumo de estadísticas de todos los módulos, gráficos Recharts
Indicadores: ✅ PARA REVISAR - CRUD completo de KPIs, registro de mediciones, semáforos
Usuarios: ✅ PARA REVISAR - CRUD de usuarios, asignación de roles

Funcionalidades específicas:

✅ Fórmulas configurables por indicador con sus responsables reales (Vicerrectorado Académico, Oficina de Planeamiento, etc.)
✅ Dashboard muestre KPIs agrupados por objetivo estratégico (OEI.01 al OEI.05 + OC.01)
✅ Alertas automáticas cuando un indicador baja del umbral
✅ Gráfico de tendencia histórica por indicador
⏳ Exportar reporte PDF del dashboard completo (PENDIENTE)
✅ Gestión de roles: admin, auditor, usuario, solo_lectura (SISTEMA RBAC PARA REVISAR)
✅ Sistema de permisos granulares por módulo (CONFIGURABLE EN backend/config/roles-permisos.js)

Tareas pendientes para 100% funcional:
- Implementar generación de PDF del dashboard completo
- Implementar endpoint GET /api/dashboard/pdf
- Verificar que las alertas de indicadores funcionen correctamente en tiempo real


👨‍💻 GERALDINE — Módulos: Documentos + Procesos
Responsabilidad: El núcleo documental y operativo del SGC, que es la base de toda acreditación.
CRUDs a implementar:

Documentos: ✅ PARA REVISAR - crear, editar, versionar, cambiar estado, adjuntar archivos
Categorías de documentos: ✅ PARA REVISAR - políticas, manuales, procedimientos, instructivos, formatos
Procesos: ✅ PARA REVISAR - CRUD de macroprocesos, procesos y subprocesos con jerarquía
Actividades por proceso: ✅ PARA REVISAR - orden, responsable, tipo de actividad

Funcionalidades específicas:

✅ Flujo de aprobación completo: borrador → revisión → aprobado → vigente → obsoleto
✅ Control de versiones con historial de cambios
✅ Vista árbol del mapa de procesos institucional
✅ Vinculación documento ↔ proceso
✅ Búsqueda por código, categoría y estado
✅ PDF ficha de documento y ficha de proceso (ENDPOINTS PARA REVISARS)
⏳ Notificación (badge) cuando un documento requiere revisión del usuario actual (PENDIENTE)

Tareas pendientes para 100% funcional:
- Implementar sistema de notificaciones en el topbar (campana)
- Verificar que la generación de PDF funcione correctamente
- Implementar lógica de notificaciones para documentos pendientes de revisión


👨‍💻 STIVEN — Módulos: Acreditación + Auditorías + CAPA
Responsabilidad: El corazón del cumplimiento normativo — lo que más le importa a la Oficina de Gestión de la Calidad de la UNT.
CRUDs a implementar:

Autoevaluaciones: ✅ PARA REVISAR - crear por modelo (SINEACE / ISO 21001), asignar responsable
Estándares: ⏳ PENDIENTE - gestión desde frontend (actualmente solo en SQL)
Evidencias: ✅ PARA REVISAR - registro por estándar con % de cumplimiento y semáforo
Auditorías: ✅ PARA REVISAR - programas, planificación, auditores, ejecución
Hallazgos: ✅ PARA REVISAR - clasificación (conforme / NC menor / NC mayor / observación)
No conformidades CAPA: ✅ PARA REVISAR - registro, análisis causa raíz, plan de acción

Funcionalidades específicas:

✅ Semáforo de avance por autoevaluación (rojo/amarillo/verde) con barra de progreso real
⏳ Gestión de estándares SINEACE e ISO 21001 desde el frontend (PENDIENTE - CRUD de estándares)
✅ Filtro de evidencias por estándar, estado de cumplimiento y responsable
✅ Seguimiento de hallazgos hasta cierre con evidencias adjuntas
✅ Análisis de causa raíz: formulario 5 porqués e Ishikawa
✅ PDF informe de autoevaluación y PDF informe de auditoría (ENDPOINTS PARA REVISARS)
✅ Vinculación automática: hallazgo de auditoría → genera CAPA

Tareas pendientes para 100% funcional:
- Implementar CRUD de estándares desde frontend (SINEACE / ISO 21001)
- Crear endpoint GET /api/acreditacion/estandares
- Crear endpoint POST/PUT/DELETE /api/acreditacion/estandares
- Verificar que la generación de PDF funcione correctamente


👨‍💻 ROBERTO — Módulos: Riesgos + Satisfacción + Perfil/Notificaciones + n8n
Responsabilidad: Control de riesgos institucionales, voz de los usuarios, experiencia del sistema y automatizaciones.
CRUDs a implementar:

Riesgos: ✅ PARA REVISAR - CRUD completo con categorías, planes de mitigación, monitoreo periódico
Encuestas: ✅ PARA REVISAR - crear, publicar, cerrar, agregar preguntas (Likert, NPS, opción múltiple)
Respuestas: ✅ PARA REVISAR - formulario público de respuesta (sin login para estudiantes)
Perfil de usuario: ✅ PARA REVISAR - ver y editar datos propios, cambiar contraseña
n8n: ⏳ PENDIENTE - configuración de workflows de automatización

Funcionalidades específicas:

✅ Matriz 5×5 visual interactiva con conteo de riesgos por celda
✅ Monitoreo periódico de riesgos con gráfico de tendencia de nivel
✅ Página pública /encuesta/[uuid] accesible sin login para estudiantes y docentes
✅ Resultados en tiempo real: media, moda y NPS por pregunta
⏳ Precargar encuesta de satisfacción del objetivo OC.01 (PENDIENTE - crear desde backend)
⏳ Notificaciones reales en el topbar (campana): documentos pendientes, CAPA venciendo, alertas de indicadores (PENDIENTE)
✅ Página /perfil con edición de datos y cambio de contraseña
✅ PDF resultados de encuesta con estadísticas (ENDPOINT PARA REVISAR)

**Automatizaciones con n8n:**
- ⏳ Configurar instancia de n8n para workflows de automatización
- ⏳ Workflow: Notificaciones por email cuando un documento requiere revisión
- ⏳ Workflow: Alertas por email cuando un indicador baja del umbral
- ⏳ Workflow: Recordatorios de CAPA venciendo o vencidas
- ⏳ Workflow: Generación de reportes periódicos (semanales/mensuales)
- ⏳ Integración con endpoints del backend para disparar workflows
- ⏳ Configurar webhooks para eventos del sistema (documentos, indicadores, CAPA, etc.)

Tareas pendientes para 100% funcional:
- Crear encuesta de satisfacción OC.01 desde backend (INSERT en tabla encuestas)
- Implementar sistema de notificaciones en el topbar (campana)
- Crear endpoint GET /api/notificaciones para obtener notificaciones del usuario
- Implementar lógica de notificaciones para CAPA venciendo y alertas de indicadores
- Verificar que la generación de PDF funcione correctamente
- Instalar y configurar n8n (Docker o npm)
- Crear workflows de automatización en n8n para notificaciones por email
- Configurar webhooks en el backend para disparar workflows de n8n
- Implementar endpoints para enviar eventos a n8n (POST /api/webhooks/...)


Resumen visual
Estudiante 1          Estudiante 2          Estudiante 3              Estudiante 4
─────────────         ─────────────         ─────────────             ─────────────
Dashboard ✅      +    Documentos ✅   +    Acreditación ⏳      +    Riesgos ✅
Indicadores ✅    +    Procesos ✅     +    Auditorías ✅        +    Satisfacción ✅
Usuarios ✅                                  CAPA ✅                  Perfil ✅
                                                                    + n8n ⏳

KPIs reales UNT       Flujo documental      Cumplimiento normativo     Riesgos + encuestas
(DP-OC-001) ✅        + mapa procesos ✅    SINEACE / ISO 21001 ⏳    públicas ✅ + alertas ⏳
                                                                    + automatizaciones ⏳

Lo que todos deben respetar
| Regla compartida | Detalle |
| --- | --- |
| Un solo rol por ahora | Solo admin activo, sin bloqueos por rol en frontend |
| Nombres en español | Tablas, variables, labels y rutas en español |
| PDF en cada módulo | Cada módulo debe tener al menos un endpoint de descarga |
| Consistencia de BD | No modificar nombres de tablas ya existentes sin coordinar |
| Componentes UI compartidos | Usar /components/ui/index.jsx para Badge, Modal, StatCard, etc. |
| Uso obligatorio de Sequelize | Todo el código de base de datos a futuro debe utilizar Sequelize ORM (modelos, migraciones y seeders). El código legado actual se mantiene como está con consultas SQL tradicionales utilizando la configuración legada (`backend/config/db.js`) y se actualizará en el futuro. |



Roles y Permisos (SISTEMA RBAC PARA REVISAR)
Rol	Documentos	Procesos	Auditorías	CAPA	Riesgos	Indicadores	Usuarios
admin	✅ Full	✅ Full	✅ Full	✅ Full	✅ Full	✅ Full	✅ Full
auditor	✅ R/W	✅ R/W	✅ Full	✅ R/W	✅ R/W	✅ R/W	❌
usuario	✅ R/W	✅ R/W	👁 Read	✅ R/W	✅ R/W	✅ R/W	❌
solo_lectura	👁 Read	👁 Read	👁 Read	👁 Read	👁 Read	👁 Read	❌

**Sistema RBAC PARA REVISAR:**
- Archivo de configuración: `backend/config/roles-permisos.js`
- Para agregar/modificar roles y permisos: editar el archivo y ejecutar `npm run sync:permisos`
- El comando `npm run db:setup` ahora ejecuta automáticamente: db:migrate (Sequelize) + db:seed (Sequelize) + sync:permisos
- Los permisos se cargan desde la base de datos en cada petición autenticada

Generación de PDFs
Cada módulo expone un endpoint de descarga PDF (ENDPOINTS PARA REVISARS):

GET /api/documentos/:id/pdf
GET /api/procesos/:id/pdf
GET /api/acreditacion/autoevaluaciones/:id/pdf
GET /api/auditorias/:id/pdf
GET /api/acciones/:id/pdf
GET /api/riesgos/:id/pdf
GET /api/indicadores/:id/pdf
GET /api/satisfaccion/:id/pdf

**Tareas pendientes generales para 100% funcional:**
1. Verificar que todos los endpoints de PDF generen correctamente los documentos
2. Implementar sistema de notificaciones en el topbar (campana)
3. Implementar CRUD de estándares desde frontend (Estudiante 3)
4. Crear encuesta de satisfacción OC.01 desde backend (Estudiante 4)
5. Implementar lógica de alertas automáticas en tiempo real
6. Implementar endpoint para exportar PDF del dashboard completo