require('dotenv').config();
const { pool } = require('./config/db');

const sql = `
INSERT INTO auditores_auditoria (auditoria_id, usuario_id, rol_auditoria, creado_en, actualizado_en)
SELECT id, auditor_lider_id, 'auditor_lider', NOW(), NOW()
FROM auditorias
WHERE NOT EXISTS (
  SELECT 1 FROM auditores_auditoria WHERE auditores_auditoria.auditoria_id = auditorias.id AND auditores_auditoria.usuario_id = auditorias.auditor_lider_id
)
RETURNING auditoria_id, usuario_id;
`;

async function main() {
  try {
    const result = await pool.query(sql);
    if (result.rows.length > 0) {
      console.log(`✅ Auditor líder agregados a ${result.rows.length} auditorías existentes!`);
    } else {
      console.log('ℹ️ Todas las auditorías ya tienen su auditor líder en el equipo.');
    }
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    pool.end();
  }
}

main();
