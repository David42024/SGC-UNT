require('dotenv').config();
const { pool } = require('../config/db');

async function insertISO21001Estandares() {
  console.log('Conectando a la base de datos...');
  const client = await pool.connect();

  try {
    // First check if modelo ISO 21001 exists
    const modeloCheck = await client.query('SELECT * FROM modelos_acreditacion WHERE nombre LIKE $1', ['%ISO 21001%']);
    let modeloId;
    if (modeloCheck.rows.length === 0) {
      console.log('Insertando modelo ISO 21001:2018...');
      const modeloRes = await client.query(`
        INSERT INTO modelos_acreditacion (nombre, descripcion, entidad, version, activo)
        VALUES ($1, $2, $3, $4, true)
        RETURNING id
      `, [
        'ISO 21001:2018', 
        'Modelo de gestión para organizaciones educativas', 
        'ISO', 
        '2018'
      ]);
      modeloId = modeloRes.rows[0].id;
    } else {
      modeloId = modeloCheck.rows[0].id;
      console.log('Modelo ISO 21001:2018 ya existe con id:', modeloId);
    }

    // Insertar factores de ISO 21001
    const factores = [
      { codigo: 'F1', nombre: 'Contexto de la organización', descripcion: 'Determinar y gestionar el contexto interno y externo, necesidades y expectativas de las partes interesadas.' },
      { codigo: 'F2', nombre: 'Liderazgo', descripcion: 'Demostrar compromiso de la alta dirección, política y roles de gestión.' },
      { codigo: 'F3', nombre: 'Planificación', descripcion: 'Planificar acciones para abordar riesgos y oportunidades, establecer objetivos y planes.' },
      { codigo: 'F4', nombre: 'Apoyo', descripcion: 'Proporcionar recursos necesarios: competencia, conciencia, comunicación, documentación y infraestructura.' },
      { codigo: 'F5', nombre: 'Operación', descripcion: 'Gestión de procesos educativos, diseño y desarrollo de programas, apoyo a estudiantes y monitoreo.' },
      { codigo: 'F6', nombre: 'Evaluación del desempeño', descripcion: 'Medir, analizar y evaluar el desempeño del sistema de gestión.' },
      { codigo: 'F7', nombre: 'Mejora', descripcion: 'Identificar y implementar oportunidades de mejora, gestión de no conformidades y acciones correctivas.' }
    ];

    for (const factor of factores) {
      const exists = await client.query('SELECT id FROM estandares_acreditacion WHERE modelo_id = $1 AND codigo = $2', [modeloId, factor.codigo]);
      if (exists.rows.length === 0) {
        await client.query(`
          INSERT INTO estandares_acreditacion (modelo_id, padre_id, codigo, nombre, descripcion, nivel, peso_ponderacion)
          VALUES ($1, NULL, $2, $3, $4, 'factor', 1.00)
        `, [modeloId, factor.codigo, factor.nombre, factor.descripcion]);
        console.log(`Insertado: ${factor.codigo} - ${factor.nombre}`);
      } else {
        console.log(`Ya existe: ${factor.codigo}`);
      }
    }

    console.log('Datos insertados correctamente');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

insertISO21001Estandares();
