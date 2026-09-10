-- ============================================================================
-- schema.sql
-- Estructura de la base de datos de "Gestión de Fábrica".
-- Motor: PostgreSQL 17.
-- ============================================================================

CREATE TABLE IF NOT EXISTS clientes (
  id         SERIAL PRIMARY KEY,
  nombre     TEXT NOT NULL,
  cif        TEXT NOT NULL UNIQUE,
  telefono   TEXT,
  email      TEXT,
  direccion  TEXT
);

CREATE TABLE IF NOT EXISTS empleados (
  id         SERIAL PRIMARY KEY,
  nombre     TEXT NOT NULL,
  puesto     TEXT,
  turno      TEXT,
  nomina     NUMERIC(10, 2),
  fecha_alta DATE
);

CREATE TABLE IF NOT EXISTS proveedores (
  id        SERIAL PRIMARY KEY,
  nombre    TEXT NOT NULL,
  cif       TEXT NOT NULL UNIQUE,
  material  TEXT,
  telefono  TEXT,
  email     TEXT
);

CREATE TABLE IF NOT EXISTS troqueles (
  id          SERIAL PRIMARY KEY,
  codigo      TEXT NOT NULL UNIQUE,
  tipo        TEXT,
  dimensiones TEXT,
  estado      TEXT,
  ubicacion   TEXT
);

CREATE TABLE IF NOT EXISTS articulos (
  id          SERIAL PRIMARY KEY,
  referencia  TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  medidas     TEXT,
  precio      NUMERIC(10, 2),
  material    TEXT
);

CREATE TABLE IF NOT EXISTS cliches (
  id         SERIAL PRIMARY KEY,
  codigo     TEXT NOT NULL UNIQUE,
  diseno     TEXT,
  tintas     TEXT,
  estado     TEXT,
  cliente_id INTEGER REFERENCES clientes(id)
);

CREATE TABLE IF NOT EXISTS pedidos (
  id            SERIAL PRIMARY KEY,
  numero        TEXT NOT NULL UNIQUE,
  cliente_id    INTEGER NOT NULL REFERENCES clientes(id),
  fecha_entrega DATE,
  estado        TEXT
);

CREATE TABLE IF NOT EXISTS pedidos_articulos (
  pedido_id   INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  articulo_id INTEGER NOT NULL REFERENCES articulos(id) ON DELETE CASCADE,
  cantidad    INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (pedido_id, articulo_id)
);
