-- Crea el usuario
CREATE USER sgc_user WITH PASSWORD 'sgc_pass_2024';

-- Crea la base de datos
CREATE DATABASE sgc_unt OWNER sgc_user;

-- Conectarse a la nueva base de datos
\c sgc_unt

-- Otorga privilegios necesarios
GRANT ALL PRIVILEGES ON SCHEMA public TO sgc_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sgc_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sgc_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO sgc_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO sgc_user;