# Especificación y Planificación: Encuestas con SurveyJS

Este documento detalla la planificación y el diseño técnico para la reestructuración del módulo de Satisfacción, incorporando **SurveyJS** para el renderizado público de encuestas, control refinado de visibilidad/privacidad, gestión de estados y bitácora de ampliaciones/reducciones de fechas.

---

## 1. Arquitectura y Nuevas Rutas

### 1.1. Frontend
* **Ruta Pública de Listado**: `/encuestas` (accesible sin inicio de sesión)
  * Servirá para mostrar un listado general de todas las encuestas abiertas en estado **EN PROGRESO**.
  * Mostrará únicamente encuestas con visibilidad **Pública** y **De Estudiantes** (las privadas están excluidas y se implementarán a futuro).
  * Mostrará el título y la descripción de cada encuesta y contendrá enlaces/redirecciones a la página individual de respuesta.
* **Ruta Pública de Respuesta**: `/encuestas/[uuid]` (o `/encuesta/[uuid]`)
  * Utilizará la biblioteca **SurveyJS** (React Runner) para renderizar dinámicamente las preguntas basadas en la estructura JSON guardada.
* **Enlace al Creador Externo**:
  * En el CRUD de encuestas se proporcionará un enlace directo al creador oficial y gratuito de SurveyJS: [https://surveyjs.io/create-free-survey](https://surveyjs.io/create-free-survey).
  * Los administradores diseñarán allí la encuesta, exportarán el esquema JSON y lo importarán al CRUD del sistema. No se integrará una instancia local de SurveyJS Creator para evitar sobrecarga de dependencias.

---

## 2. Clasificación de Encuestas

### 2.1. Clasificación por Visibilidad
Determina quién puede acceder a la encuesta:
1. **Privadas** (`privada`):
   * Dirigidas a un grupo específico de usuarios del sistema.
   * Requieren inicio de sesión.
   * *Nota*: Esta funcionalidad queda definida para desarrollo futuro y estará deshabilitada o marcada como no disponible por el momento.
2. **De Estudiantes** (`estudiante`):
   * Requiere el ingreso de un **Código de Estudiante** antes de iniciar la encuesta.
   * El código debe validarse en el cliente para asegurar que sea numérico y tenga exactamente **10 dígitos** (sin validación contra base de datos de matrículas).
3. **Públicas** (`publica`):
   * Accesibles para cualquier persona. No requieren login ni código de estudiante.

### 2.2. Clasificación por Privacidad
Determina el registro de la identidad del encuestado:
1. **Anónimas** (`anonima`):
   * Bajo ninguna circunstancia se almacena el código de estudiante o el identificador de usuario (`respondente_id` o `codigo_estudiante` se guardarán como `NULL`).
2. **No Anónimas** (`no_anonima`):
   * Se almacena el código de estudiante (`codigo_estudiante`) o el ID de usuario según corresponda.

---

## 3. Flujo y Control de Estados

Las encuestas tendrán los siguientes estados calculados en **tiempo de consulta (dinámicamente)**:
* **SUSPENDIDO**: Estado manual activado por el administrador desde el CRUD. Detiene temporalmente las respuestas sin importar las fechas. Se activa marcando la columna `estado` persistida como `'suspendido'` en base de datos.
* **PENDIENTE**: Si el estado no está suspendido y la fecha actual es anterior a la `fecha_inicio`.
* **EN PROGRESO**: Si el estado no está suspendido y la fecha actual se encuentra en el rango `[fecha_inicio, fecha_cierre]`.
* **FINALIZADO**: Si el estado no está suspendido y la fecha actual es posterior a la `fecha_cierre`.

### Transiciones y Acciones en el CRUD:
* **Botón Suspender**: Modifica el valor en base de datos a `suspendido`. Solo es aplicable si la encuesta no estaba suspendida y su estado dinámico no era `FINALIZADO`.
* **Botón Republicar**: Disponible para encuestas en estado `SUSPENDIDO`. Remueve el estado suspendido en base de datos. Si la fecha actual se encuentra en el rango válido, la encuesta pasará dinámicamente a calcularse como `EN PROGRESO`.

---

## 4. Ampliaciones y Reducciones de Fechas
Desde el CRUD, el administrador podrá modificar las fechas de inicio y cierre de una encuesta.
El backend **calculará automáticamente** el tipo de ajuste (`ampliacion` o `reduccion`) comparando la nueva fecha de cierre (`fecha_cierre_nueva`) con la fecha de cierre anterior (`fecha_cierre_anterior`):
* Si `fecha_cierre_nueva > fecha_cierre_anterior`, el tipo de ajuste se registrará como `'ampliacion'`.
* Si `fecha_cierre_nueva < fecha_cierre_anterior`, el tipo de ajuste se registrará como `'reduccion'`.

Cualquier cambio de fechas registrará una bitácora en la tabla `historial_fechas_encuesta` que contenga:
* Usuario responsable del cambio (`usuario_id`).
* Fechas previas (`fecha_inicio_anterior`, `fecha_cierre_anterior`).
* Nuevas fechas (`fecha_inicio_nueva`, `fecha_cierre_nueva`).
* Tipo de ajuste calculado (`ampliacion` o `reduccion`).
* Motivo detallado ingresado por el administrador.

---

## 5. Respuestas de Encuestas
* Las respuestas recolectadas por SurveyJS se guardarán en la base de datos en formato **JSON** (tipo de dato `JSONB` en Postgres).
* Se debe respetar estrictamente la capitalización original (mayúsculas y minúsculas) de las claves y valores generados por SurveyJS.
* Desde el CRUD de encuestas, el botón **"Ver Encuesta"** abrirá una vista detallada mostrando las respuestas del usuario final de forma limpia y correctamente formateada.

---

## 6. Diseño del Modelo de Datos (Sequelize)

Para implementar este plan, se deberán realizar las siguientes modificaciones de base de datos a futuro mediante migraciones de Sequelize:

### 6.1. Alteración a la Tabla `encuestas`
Se agregarán o modificarán los siguientes campos:
```javascript
visibilidad: {
  type: DataTypes.STRING(20),
  allowNull: false,
  defaultValue: 'publica', // 'privada', 'estudiante', 'publica'
},
privacidad: {
  type: DataTypes.STRING(20),
  allowNull: false,
  defaultValue: 'anonima', // 'anonima', 'no_anonima'
},
estado: {
  type: DataTypes.STRING(20),
  allowNull: false,
  defaultValue: 'pendiente', // 'pendiente', 'suspendido', 'en_progreso', 'finalizado'
},
estructura_json: {
  type: DataTypes.JSONB,
  allowNull: true // Contendrá la estructura exportada de SurveyJS Creator
}
```

### 6.2. Nueva Tabla `respuestas_survey` (o alteración a `respuestas_encuesta`)
Contendrá las respuestas estructuradas en formato JSON:
```javascript
id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
encuesta_id: { type: DataTypes.INTEGER, references: { model: 'encuestas', key: 'id' } },
codigo_estudiante: { type: DataTypes.STRING(10), allowNull: true }, // Solo si es 'estudiante' y 'no_anonima'
respuestas: { type: DataTypes.JSONB, allowNull: false }, // Respuestas de SurveyJS respetando mayúsculas/minúsculas
fecha_respuesta: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
```

### 6.3. Nueva Tabla `historial_fechas_encuesta`
Registrará la bitácora de auditoría de los cambios de fechas:
```javascript
id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
encuesta_id: { type: DataTypes.INTEGER, references: { model: 'encuestas', key: 'id' }, onDelete: 'CASCADE' },
usuario_id: { type: DataTypes.INTEGER, references: { model: 'usuarios', key: 'id' } },
fecha_inicio_anterior: { type: DataTypes.DATEONLY },
fecha_cierre_anterior: { type: DataTypes.DATEONLY },
fecha_inicio_nueva: { type: DataTypes.DATEONLY },
fecha_cierre_nueva: { type: DataTypes.DATEONLY },
tipo_ajuste: { type: DataTypes.STRING(20) }, // 'ampliacion', 'reduccion'
motivo: { type: DataTypes.TEXT, allowNull: false },
creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
```
