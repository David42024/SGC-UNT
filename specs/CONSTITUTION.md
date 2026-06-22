# Constitución del Proyecto SGC-UNT

Este documento establece las directrices, estándares y bases arquitectónicas del **Sistema de Gestión de la Calidad (SGC)** de la **Universidad Nacional de Trujillo (UNT)**. Es el documento padre de gobernanza técnica de todo el proyecto y todas las implementaciones deben adherirse estrictamente a sus reglas.

> [!IMPORTANT]
> **Historial de Cambios**: Ante cualquier cambio en la constitución, base de datos, requerimientos o configuraciones del proyecto, es obligatorio realizar el registro detallado en el archivo de historial en [specs/HISTORY.md].

---

## 1. Visión del Sistema
El SGC-UNT es una plataforma integrada diseñada para centralizar, automatizar y auditar los procesos de aseguramiento de la calidad y cumplimiento de acreditación institucional (SINEACE, ISO 21001) en la Universidad Nacional de Trujillo.

---

## 2. Pila Tecnológica (Tech Stack)
* **Frontend**: Next.js / React (utilizando TailwindCSS y Vanilla CSS para estilos, Recharts para visualización de gráficos).
* **Backend**: Node.js + Express.
* **Base de Datos**: PostgreSQL + Sequelize ORM.
* **Automatización**: Instancia de n8n para el manejo de workflows y alertas de email/notificaciones.

---

## 3. Principios de Diseño y Estándares de Código
Para garantizar el mantenimiento a largo plazo y la legibilidad colectiva de la base de código, se establecen las siguientes reglas:

### 3.1. Idioma y Nombres
* **Nombres en Español**: Todo el código de base de datos (tablas, columnas), variables del backend y del frontend, etiquetas (labels) de UI y rutas de API deben estar en español.
* **Comentarios y Documentación**: Escritos en español para facilitar la colaboración.

### 3.2. Consistencia y Estructura de Base de Datos
* **Uso Obligatorio de Sequelize**: Toda nueva estructura de datos, tabla o alteración debe ser implementada obligatoriamente mediante migraciones y modelos de Sequelize.
* **Modelo Relacional**: No se deben renombrar ni alterar tablas o relaciones existentes sin coordinación previa para no romper otros módulos.
* **Indices y Triggers**: Utilizar triggers para la actualización automática del campo `actualizado_en` (`actualizar_timestamp`) e índices en columnas de alta consulta (`estado`, `uuid`, claves foráneas).

### 3.3. Interfaz de Usuario y Estética Premium
* **Componentes UI Compartidos**: Utilizar los componentes compartidos ubicados en `frontend/components/ui/index.jsx` (tales como `Badge`, `Modal`, `StatCard`, etc.). Evitar la duplicación de código de UI común.
* **Estilo Visual**: Asegurar una experiencia de usuario responsiva, moderna, limpia, y consistente con los colores y la tipografía institucionales.

---

## 4. Control de Acceso y Seguridad (RBAC)
El sistema implementa un Control de Acceso Basado en Roles (RBAC) gestionado de forma centralizada:
* **Roles del Sistema**: `admin` (acceso total), `auditor` (lectura/escritura en auditorías y CAPA, lectura general), `usuario` (lectura/escritura de módulos asignados), `solo_lectura` (solo dashboards y visualización).
* **Configuración de Permisos**: Definida estrictamente en `backend/config/roles-permisos.js`.
* **Sincronización**: Al realizar cambios en la configuración de permisos, se debe ejecutar `npm run sync:permisos` para actualizar la base de datos.
* **Comando db:setup**: El comando `npm run db:setup` ejecuta secuencialmente:
  1. `db:migrate` (Sequelize)
  2. `db:seed` (Sequelize)
  3. Sincronización de permisos a la base de datos.

---

## 5. Reportes y Documentación (PDFs)
Cada módulo operativo expone obligatoriamente un endpoint HTTP GET en el backend que genera y descarga su reporte/ficha en formato PDF:
* **Documentos**: `/api/documentos/:id/pdf`
* **Procesos**: `/api/procesos/:id/pdf`
* **Autoevaluaciones**: `/api/acreditacion/autoevaluaciones/:id/pdf`
* **Auditorías**: `/api/auditorias/:id/pdf`
* **CAPA (Acciones)**: `/api/acciones/:id/pdf`
* **Riesgos**: `/api/riesgos/:id/pdf`
* **Satisfacción**: `/api/satisfaccion/:id/pdf`
* **Dashboard Completo**: `/api/dashboard/pdf` (Exportar reporte PDF del dashboard)

---

## 6. Arquitectura de Notificaciones y Automatizaciones (n8n)
La experiencia del usuario y los flujos críticos de calidad se automatizan a través de un motor de workflows n8n:
* **Canalización de Eventos**: El backend expone webhooks en `/api/webhooks/...` para enviar eventos a n8n.
* **Casos de Uso de Workflows**:
  * Notificaciones por email cuando un documento requiere revisión.
  * Alertas por correo cuando un indicador clave (KPI) cae por debajo del umbral crítico.
  * Recordatorios automáticos para CAPA venciendo o vencidas.
  * Envío periódico (semanal/mensual) de reportes de estado de calidad.
