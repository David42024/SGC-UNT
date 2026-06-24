'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Usuarios para los demás roles
    await queryInterface.bulkInsert('usuarios', [
      {
        id: 2,
        uuid: Sequelize.literal('uuid_generate_v4()'),
        nombres: 'Auditor',
        apellidos: 'UNT',
        correo: 'auditor@unt.edu.pe',
        contrasena_hash: Sequelize.literal("crypt('Auditor1234!', gen_salt('bf'))"),
        rol_id: 2, // auditor
        area: 'Auditoría Interna',
        cargo: 'Auditor',
        activo: true,
        creado_en: new Date(),
        actualizado_en: new Date()
      },
      {
        id: 3,
        uuid: Sequelize.literal('uuid_generate_v4()'),
        nombres: 'Usuario',
        apellidos: 'Estándar',
        correo: 'usuario@unt.edu.pe',
        contrasena_hash: Sequelize.literal("crypt('Usuario1234!', gen_salt('bf'))"),
        rol_id: 3, // usuario
        area: 'Operaciones',
        cargo: 'Usuario General',
        activo: true,
        creado_en: new Date(),
        actualizado_en: new Date()
      },
      {
        id: 4,
        uuid: Sequelize.literal('uuid_generate_v4()'),
        nombres: 'Solo',
        apellidos: 'Lectura',
        correo: 'sololectura@unt.edu.pe',
        contrasena_hash: Sequelize.literal("crypt('SoloLectura1234!', gen_salt('bf'))"),
        rol_id: 4, // solo_lectura
        area: 'Consultas',
        cargo: 'Usuario Sólo Lectura',
        activo: true,
        creado_en: new Date(),
        actualizado_en: new Date()
      }
    ], {});

    // Ajustar secuencia de usuarios
    await queryInterface.sequelize.query("SELECT setval('usuarios_id_seq', 4)");
  },

  async down(queryInterface, Sequelize) {
    // Eliminar los usuarios creados por este seeder
    await queryInterface.bulkDelete('usuarios', {
      id: { [Sequelize.Op.in]: [2, 3, 4] }
    }, {});
  }
};
