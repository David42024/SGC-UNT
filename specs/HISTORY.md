# Historial de Cambios y Versiones (HISTORY.md)

Este documento registra cronológicamente cualquier cambio en la constitución del proyecto, requerimientos, base de datos (migraciones), modelos o configuraciones globales del SGC-UNT. 

Cualquier cambio técnico o de requerimientos debe ser anexado a este documento indicando fecha, autor y los archivos modificados.

---

## Registro de Cambios

### [2026-06-22] - Migración a Sequelize y Gobernanza de Especificaciones
* **Autor**: Roberto / Asistente AI
* **Cambios realizados**:
  * Traducidas las consultas SQL raw del commit `01da67b2c2e512682d5bbba61a31363ab93eb047` a una migración nativa de Sequelize ([20260622000000-agregar-campos-verificacion-no-conformidades.js](file:///home/robertoa1/Documentos/SGC-UNT/backend/migrations/20260622000000-agregar-campos-verificacion-no-conformidades.js)).
  * Actualizado el modelo de Sequelize `NoConformidad` en [index.js](file:///home/robertoa1/Documentos/SGC-UNT/backend/models/index.js) con los nuevos campos de verificación.
  * Actualizado el script legacy [schema.sql](file:///home/robertoa1/Documentos/SGC-UNT/backend/database/schema.sql) para consistencia.
  * Creado el documento de la constitución del proyecto ([specs/CONSTITUTION.md](file:///home/robertoa1/Documentos/SGC-UNT/specs/CONSTITUTION.md)) para guiar las directrices arquitectónicas globales.
  * Vinculado [AGENTS.md](file:///home/robertoa1/Documentos/SGC-UNT/AGENTS.md) a [specs/CONSTITUTION.md](file:///home/robertoa1/Documentos/SGC-UNT/specs/CONSTITUTION.md) como documento padre.
  * Creado este registro de historial en [specs/HISTORY.md](file:///home/robertoa1/Documentos/SGC-UNT/specs/HISTORY.md).
