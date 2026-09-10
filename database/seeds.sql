-- ============================================================================
-- seeds.sql
-- Datos de ejemplo: 10 registros por entidad (idempotente).
-- Ejecutar después de schema.sql.
-- ============================================================================

-- ---------------------------------------------------------------- Clientes --
INSERT INTO clientes (id, nombre, cif, telefono, email, direccion) VALUES
  (1,  'Cartonajes del Sur S.L.', 'B41000001', '954 100 001', 'pedidos@cartonajesdelsur.es', 'Pol. Ind. La Negrilla, Sevilla'),
  (2,  'Embalajes Levante S.A.', 'A03000002', '963 200 002', 'info@embalajeslevante.com', 'C/ Industria 12, Valencia'),
  (3,  'Cajas y Envases Norte', 'B48000003', '944 300 003', 'ventas@cajasnorte.es', 'Barrio Elorrieta, Bilbao'),
  (4,  'Distribuciones Ortega', 'B28000004', '915 400 004', 'contacto@distortega.com', 'Av. de Córdoba 45, Madrid'),
  (5,  'Papelera del Ebro', 'B50000005', '976 500 005', 'admin@papeleraelebro.com', 'Ctra. de Logroño 8, Zaragoza'),
  (6,  'Gráficas Manchegas', 'B13000006', '926 600 006', 'hola@graficasmanchegas.es', 'Pol. Ind. Larache, Ciudad Real'),
  (7,  'Logística Cánovas', 'B08000007', '933 700 007', 'compras@canovaslog.es', 'Zona Franca, Barcelona'),
  (8,  'Frutas del Segura', 'B30000008', '968 800 008', 'frutas@delsegura.com', 'C/ Mayor 3, Murcia'),
  (9,  'Vinos de la Ribera', 'B26000009', '941 900 009', 'bodega@vinosribera.es', 'Camino de la Bodega, Logroño'),
  (10, 'Farmacias Unidas', 'B29000010', '952 100 010', 'central@farmaciasunidas.com', 'Av. Andalucía 20, Málaga')
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------- Proveedores --
INSERT INTO proveedores (id, nombre, cif, material, telefono, email) VALUES
  (1,  'Cartonajes Reunidos',    'A41010001', 'Cartón ondulado',      '954 111 001', 'ventas@cartonajesreunidos.es'),
  (2,  'Tintas Flexo Ibérica',   'B46010002', 'Tinta flexográfica',   '963 222 002', 'info@tintasflexo.com'),
  (3,  'Planchas y Clichés',     'B08010003', 'Planchas de cliché',   '933 333 003', 'pedidos@planchasycliches.es'),
  (4,  'Papelera Mediterránea',  'A03010004', 'Papel kraft',          '965 444 004', 'papel@mediterranea.com'),
  (5,  'Químicos del Ebro',      'B50010005', 'Colas y adhesivos',    '976 555 005', 'quimicos@delEbro.es'),
  (6,  'Troqueles del Norte',    'B48010006', 'Troqueles de corte',   '944 666 006', 'troqueles@norte.com'),
  (7,  'Films y Laminados',      'A28010007', 'Film estirable',       '915 777 007', 'films@laminados.es'),
  (8,  'Tintas Acuosas Sur',     'B41010008', 'Tinta al agua',        '954 888 008', 'acuosas@sur.es'),
  (9,  'Embalajes Reciclados',   'B30010009', 'Cartón reciclado',     '968 999 009', 'reciclados@embalajes.com'),
  (10, 'Rodillos Flexográficos', 'A13010010', 'Rodillos anilox',      '926 101 010', 'rodillos@flexo.es')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------- Empleados --
INSERT INTO empleados (id, nombre, puesto, turno, nomina, fecha_alta) VALUES
  (1,  'Antonio García', 'Troquelador',              'Mañana', 1850.00, '2018-03-12'),
  (2,  'María López',    'Impresora',                'Tarde',  1920.00, '2019-07-01'),
  (3,  'José Fernández', 'Operario de montaje',      'Mañana', 1600.00, '2020-01-15'),
  (4,  'Carmen Ruiz',    'Control de calidad',       'Mañana', 1750.00, '2017-09-20'),
  (5,  'Pedro Sánchez',  'Carretillero',             'Noche',  1680.00, '2021-04-05'),
  (6,  'Lucía Díaz',     'Administrativa',           'Mañana', 1580.00, '2016-11-30'),
  (7,  'Javier Moreno',  'Mecánico',                 'Tarde',  2000.00, '2015-02-10'),
  (8,  'Elena Castro',   'Diseñadora de troqueles',  'Mañana', 2100.00, '2019-05-22'),
  (9,  'Raúl Ortega',    'Encargado de planta',      'Mañana', 2250.00, '2014-08-18'),
  (10, 'Marta Gil',      'Comercial',                'Mañana', 1900.00, '2022-02-14')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------- Troqueles --
INSERT INTO troqueles (id, codigo, tipo, dimensiones, estado, ubicacion) VALUES
  (1,  'TRQ-001', 'Troquel plano',     '600x400 mm',  'Disponible',    'Estantería A1'),
  (2,  'TRQ-002', 'Troquel rotativo',  '800x600 mm',  'En uso',        'Línea 2'),
  (3,  'TRQ-003', 'Troquel plano',     '500x350 mm',  'Mantenimiento', 'Taller'),
  (4,  'TRQ-004', 'Troquel rotativo',  '1000x700 mm', 'Disponible',    'Estantería A2'),
  (5,  'TRQ-005', 'Troquel plano',     '450x300 mm',  'Disponible',    'Estantería B1'),
  (6,  'TRQ-006', 'Troquel especial',  '750x550 mm',  'En uso',        'Línea 1'),
  (7,  'TRQ-007', 'Troquel plano',     '620x420 mm',  'Disponible',    'Estantería B2'),
  (8,  'TRQ-008', 'Troquel rotativo',  '900x650 mm',  'Mantenimiento', 'Taller'),
  (9,  'TRQ-009', 'Troquel plano',     '550x380 mm',  'Disponible',    'Estantería C1'),
  (10, 'TRQ-010', 'Troquel especial',  '680x480 mm',  'En uso',        'Línea 3')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------- Artículos --
INSERT INTO articulos (id, referencia, descripcion, medidas, precio, material) VALUES
  (1,  'ART-001', 'Caja americana estándar', '400x300x200 mm', 1.25, 'Cartón ondulado BC'),
  (2,  'ART-002', 'Caja con tapa',           '350x250x150 mm', 0.98, 'Cartón ondulado C'),
  (3,  'ART-003', 'Estuche con cierre',      '200x150x80 mm',  0.65, 'Cartoncillo'),
  (4,  'ART-004', 'Bandeja expositora',      '600x400x120 mm', 2.10, 'Cartón ondulado B'),
  (5,  'ART-005', 'Embalaje postal',         '300x200x100 mm', 0.45, 'Cartón reciclado'),
  (6,  'ART-006', 'Caja archivo',            '330x260x250 mm', 1.75, 'Cartón ondulado BC'),
  (7,  'ART-007', 'Separadores de cartón',   '400x300 mm',     0.22, 'Cartón compacto'),
  (8,  'ART-008', 'Caja para botellas',      '350x180x280 mm', 1.60, 'Cartón ondulado C'),
  (9,  'ART-009', 'Blíster de cartón',       '150x120x50 mm',  0.55, 'Cartoncillo'),
  (10, 'ART-010', 'Palet de cartón',         '1200x800 mm',    5.40, 'Cartón nido de abeja')
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------ Clichés --
INSERT INTO cliches (id, codigo, diseno, tintas, estado, cliente_id) VALUES
  (1,  'CL-001', 'Logotipo Cartonajes del Sur',  '2 tintas', 'Disponible',    1),
  (2,  'CL-002', 'Etiqueta Embalajes Levante',   '3 tintas', 'Disponible',    2),
  (3,  'CL-003', 'Motivo navideño',              '4 tintas', 'En uso',        3),
  (4,  'CL-004', 'Texto legal farmacias',        '1 tinta',  'Disponible',   10),
  (5,  'CL-005', 'Marca Vinos de la Ribera',     '3 tintas', 'Disponible',    9),
  (6,  'CL-006', 'Código de barras EAN',         '1 tinta',  'En uso',        4),
  (7,  'CL-007', 'Ilustración frutas',           '5 tintas', 'Disponible',    8),
  (8,  'CL-008', 'Sello de calidad',             '2 tintas', 'Mantenimiento', 5),
  (9,  'CL-009', 'Logotipo Papelera del Ebro',   '2 tintas', 'Disponible',    5),
  (10, 'CL-010', 'Motivo corporativo',           '4 tintas', 'En uso',        6)
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------ Pedidos --
INSERT INTO pedidos (id, numero, cliente_id, fecha_entrega, estado) VALUES
  (1,  'PED-2026-001', 1,  '2026-09-20', 'En producción'),
  (2,  'PED-2026-002', 2,  '2026-09-25', 'Pendiente'),
  (3,  'PED-2026-003', 3,  '2026-09-18', 'En producción'),
  (4,  'PED-2026-004', 4,  '2026-10-02', 'Pendiente'),
  (5,  'PED-2026-005', 5,  '2026-09-30', 'Confirmado'),
  (6,  'PED-2026-006', 6,  '2026-10-05', 'Pendiente'),
  (7,  'PED-2026-007', 7,  '2026-09-22', 'En producción'),
  (8,  'PED-2026-008', 8,  '2026-09-28', 'Confirmado'),
  (9,  'PED-2026-009', 9,  '2026-10-08', 'Pendiente'),
  (10, 'PED-2026-010', 10, '2026-09-26', 'En producción')
ON CONFLICT DO NOTHING;

-- -------------------------------------------------- Pedidos - Artículos --
INSERT INTO pedidos_articulos (pedido_id, articulo_id, cantidad) VALUES
  (1, 1, 500), (1, 2, 200), (2, 3, 1000), (3, 4, 300),
  (4, 5, 800), (5, 6, 150), (6, 7, 600),  (7, 8, 400),
  (8, 9, 1200), (9, 10, 250), (10, 1, 900), (10, 2, 350)
ON CONFLICT DO NOTHING;

-- Sincroniza las secuencias SERIAL para que futuros INSERT sin id no colisionen.
SELECT setval(pg_get_serial_sequence('clientes', 'id'),    (SELECT MAX(id) FROM clientes));
SELECT setval(pg_get_serial_sequence('empleados', 'id'),   (SELECT MAX(id) FROM empleados));
SELECT setval(pg_get_serial_sequence('proveedores', 'id'), (SELECT MAX(id) FROM proveedores));
SELECT setval(pg_get_serial_sequence('troqueles', 'id'),   (SELECT MAX(id) FROM troqueles));
SELECT setval(pg_get_serial_sequence('articulos', 'id'),   (SELECT MAX(id) FROM articulos));
SELECT setval(pg_get_serial_sequence('cliches', 'id'),     (SELECT MAX(id) FROM cliches));
SELECT setval(pg_get_serial_sequence('pedidos', 'id'),     (SELECT MAX(id) FROM pedidos));
