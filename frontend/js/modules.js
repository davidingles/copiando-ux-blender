// ============================================================================
// modules.js
// Registro de módulos de la aplicación de gestión de fábrica.
// Cada módulo representa una "editor" (sección) del programa que puede
// mostrarse dentro de cualquier área del layout, igual que en Blender cada
// área puede abrir cualquier editor (3D Viewport, Outliner, etc.).
//
// En esta primera versión (maqueta visual) los módulos solo pintan un
// placeholder con su descripción y los campos previstos. La lógica de datos
// se añadirá en una fase posterior.
// ============================================================================

export const MODULOS = [
  {
    id: 'pedidos',
    nombre: 'Pedidos',
    icono: '📦',
    color: '#4f8cff',
    descripcion: 'Pedidos de fabricación de cajas y embalajes.',
    campos: ['Nº pedido', 'Cliente', 'Fecha entrega', 'Estado', 'Artículos'],
  },
  {
    id: 'clientes',
    nombre: 'Clientes',
    icono: '🏢',
    color: '#45c46a',
    descripcion: 'Cartera de clientes y datos de contacto.',
    campos: ['Nombre', 'CIF / NIF', 'Teléfono', 'Email', 'Dirección'],
  },
  {
    id: 'empleados',
    nombre: 'Empleados',
    icono: '👷',
    color: '#e8a33d',
    descripcion: 'Plantilla de la fábrica: puestos, turnos y altas.',
    campos: ['Nombre', 'Puesto', 'Turno', 'Nómina', 'Fecha de alta'],
  },
  {
    id: 'troqueles',
    nombre: 'Troqueles',
    icono: '⚙️',
    color: '#9b7bff',
    descripcion: 'Troqueles de corte para el troquelado del cartón.',
    campos: ['Código', 'Tipo', 'Dimensiones', 'Estado', 'Ubicación'],
  },
  {
    id: 'proveedores',
    nombre: 'Proveedores',
    icono: '🚚',
    color: '#4fc3d9',
    descripcion: 'Proveedores de materiales y suministros.',
    campos: ['Nombre', 'CIF / NIF', 'Material', 'Teléfono', 'Email'],
  },
  {
    id: 'cliches',
    nombre: 'Clichés',
    icono: '🖨️',
    color: '#e06c9f',
    descripcion: 'Clichés de impresión flexográfica.',
    campos: ['Código', 'Diseño', 'Tintas', 'Estado', 'Cliente'],
  },
  {
    id: 'articulos',
    nombre: 'Artículos',
    icono: '📐',
    color: '#b8c248',
    descripcion: 'Catálogo de artículos y productos fabricados.',
    campos: ['Referencia', 'Descripción', 'Medidas', 'Precio', 'Material'],
  },
];

// Devuelve el objeto de un módulo a partir de su id.
// Si el id no existe, devuelve el primer módulo como valor seguro.
export function obtenerModulo(id) {
  return MODULOS.find((modulo) => modulo.id === id) || MODULOS[0];
}

// Pinta la maqueta visual de un módulo dentro del contenedor indicado.
export function renderizarModulo(id, contenedor) {
  const modulo = obtenerModulo(id);

  contenedor.innerHTML = `
    <div class="modulo-maqueta" style="--acento: ${modulo.color}">
      <div class="modulo-icono">${modulo.icono}</div>
      <h2 class="modulo-nombre">${modulo.nombre}</h2>
      <p class="modulo-descripcion">${modulo.descripcion}</p>
      <div class="modulo-campos">
        ${modulo.campos.map((campo) => `<span class="campo">${campo}</span>`).join('')}
      </div>
      <p class="modulo-nota">Maqueta visual · la lógica de datos se añadirá después</p>
    </div>
  `;
}
