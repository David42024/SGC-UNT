-- Agregar campos de verificación a la tabla no_conformidades
ALTER TABLE no_conformidades 
ADD COLUMN IF NOT EXISTS fecha_verificacion DATE,
ADD COLUMN IF NOT EXISTS efectividad VARCHAR(20) 
  CHECK (efectividad IN ('si', 'parcial', 'no')),
ADD COLUMN IF NOT EXISTS evidencia_url TEXT,
ADD COLUMN IF NOT EXISTS observaciones_verificacion TEXT;
