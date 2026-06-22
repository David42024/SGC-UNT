-- Insert 4 test users for auditor team testing
-- Password for all: Admin1234!

INSERT INTO usuarios (nombres, apellidos, correo, contrasena_hash, rol_id, area, cargo)
VALUES 
  ('Juan Carlos', 'García López', 'jgarcia@unt.edu.pe', crypt('Admin1234!', gen_salt('bf')), 2, 'Oficina de Calidad', 'Auditor Líder'),
  ('María Fernanda', 'Rodríguez Pérez', 'mrodriguez@unt.edu.pe', crypt('Admin1234!', gen_salt('bf')), 2, 'Oficina de Calidad', 'Auditor'),
  ('Pedro Alonso', 'Quispe Huamán', 'pquispe@unt.edu.pe', crypt('Admin1234!', gen_salt('bf')), 3, 'Facultad de Ingeniería', 'Observador'),
  ('Ana Lucía', 'Vega Castro', 'avega@unt.edu.pe', crypt('Admin1234!', gen_salt('bf')), 3, 'Facultad de Ciencias', 'Auditor')
ON CONFLICT (correo) DO NOTHING;
