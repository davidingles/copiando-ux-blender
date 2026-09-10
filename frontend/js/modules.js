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

import { TABLAS } from './datos.js';

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
  {
    id: 'explorador',
    nombre: 'Explorador',
    icono: '📁',
    color: '#f2a900',
    descripcion: 'Explorador de archivos y carpetas del equipo.',
    campos: [],
  },
];

// Devuelve el objeto de un módulo a partir de su id.
// Si el id no existe, devuelve el primer módulo como valor seguro.
export function obtenerModulo(id) {
  return MODULOS.find((modulo) => modulo.id === id) || MODULOS[0];
}

// Pinta la maqueta visual de un módulo dentro del contenedor indicado.
// `areaId` identifica el área que aloja el módulo; los módulos con estado
// propio (como el Explorador) lo usan para recordar su contenido entre renders.
export function renderizarModulo(id, contenedor, areaId = null) {
  const modulo = obtenerModulo(id);

  if (modulo.id === 'explorador') {
    renderizarExplorador(contenedor, areaId);
    return;
  }

  const tabla = TABLAS[modulo.id];
  if (tabla) {
    renderizarTabla(contenedor, modulo, tabla);
    return;
  }

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

// ============================================================================
// Explorador de archivos (módulo "explorador")
//
// Usa la File System Access API para que el usuario elija una carpeta y la
// app navegue dentro de ella, con la estética de la aplicación. El navegador
// solo puede acceder a la carpeta que el usuario selecciona (igual que en
// Blender el "File Browser" navega dentro de una ubicación). Cuando la app
// migre a Tauri, esta capa se sustituirá por el acceso real al sistema de
// archivos del escritorio.
// ============================================================================

const estadoExploradores = new Map();

function obtenerEstadoExplorador(areaId) {
  const clave = areaId || 'explorador-global';
  if (!estadoExploradores.has(clave)) {
    estadoExploradores.set(clave, { pila: [], seleccionado: null });
  }
  return estadoExploradores.get(clave);
}

function renderizarExplorador(contenedor, areaId) {
  const estado = obtenerEstadoExplorador(areaId);
  const actual =
    estado.pila.length > 0 ? estado.pila[estado.pila.length - 1] : null;

  contenedor.innerHTML = `
    <div class="explorador">
      <div class="explorador-barra">
        <button type="button" class="explorador-boton" data-accion="abrir" title="Elegir una carpeta del equipo">📂 Abrir carpeta</button>
        <button type="button" class="explorador-boton" data-accion="arriba" title="Subir un nivel" ${estado.pila.length > 1 ? '' : 'disabled'}>⬆</button>
        <button type="button" class="explorador-boton" data-accion="actualizar" title="Volver a leer la carpeta" ${actual ? '' : 'disabled'}>⟳</button>
        <nav class="explorador-ruta" aria-label="Ruta actual"></nav>
      </div>
      <div class="explorador-contenido"></div>
      <div class="explorador-pie"></div>
    </div>
  `;

  pintarRuta(contenedor, estado, areaId);

  contenedor.querySelectorAll('[data-accion]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const accion = boton.dataset.accion;
      if (accion === 'abrir') {
        abrirCarpeta(areaId, contenedor);
      } else if (accion === 'arriba') {
        if (estado.pila.length > 1) {
          estado.pila.pop();
          renderizarExplorador(contenedor, areaId);
        }
      } else if (accion === 'actualizar') {
        cargarListado(areaId, contenedor);
      }
    });
  });

  if (actual) {
    cargarListado(areaId, contenedor);
  } else {
    const contenido = contenedor.querySelector('.explorador-contenido');
    contenido.innerHTML = `
      <div class="explorador-vacio">
        <div class="explorador-vacio-icono">📁</div>
        <p><strong>Elige una carpeta</strong> de tu equipo para explorarla aquí.</p>
        <p class="explorador-nota">Requiere Chrome o Edge · no se abren ni modifican archivos</p>
      </div>
    `;
    contenedor.querySelector('.explorador-pie').textContent = '';
  }
}

function pintarRuta(contenedor, estado, areaId) {
  const ruta = contenedor.querySelector('.explorador-ruta');
  ruta.innerHTML = '';

  estado.pila.forEach((item, indice) => {
    if (indice > 0) {
      const separador = document.createElement('span');
      separador.className = 'explorador-separador';
      separador.textContent = '›';
      ruta.appendChild(separador);
    }

    const segmento = document.createElement('button');
    segmento.type = 'button';
    segmento.className = 'explorador-segmento';
    segmento.textContent = item.nombre || 'Carpeta';
    segmento.title = item.nombre || 'Carpeta';
    segmento.addEventListener('click', () => {
      estado.pila = estado.pila.slice(0, indice + 1);
      renderizarExplorador(contenedor, areaId);
    });
    ruta.appendChild(segmento);
  });
}

async function abrirCarpeta(areaId, contenedor) {
  if (!('showDirectoryPicker' in window)) {
    alert('Tu navegador no permite elegir carpetas. Usa Chrome o Edge.');
    return;
  }

  try {
    const handle = await window.showDirectoryPicker();
    const estado = obtenerEstadoExplorador(areaId);
    estado.pila = [{ handle, nombre: handle.name }];
    estado.seleccionado = null;
    renderizarExplorador(contenedor, areaId);
  } catch (error) {
    // El usuario canceló el diálogo: no se hace nada.
    if (error && error.name === 'AbortError') {
      return;
    }
    console.error('No se pudo abrir la carpeta:', error);
  }
}

async function cargarListado(areaId, contenedor) {
  const estado = obtenerEstadoExplorador(areaId);
  const actual = estado.pila[estado.pila.length - 1];
  if (!actual) {
    return;
  }

  const contenido = contenedor.querySelector('.explorador-contenido');
  contenido.innerHTML =
    '<div class="explorador-cargando">Leyendo carpeta…</div>';
  contenedor.querySelector('.explorador-pie').textContent = '';

  const entradas = await listarDirectorio(actual.handle);

  // Si mientras leíamos el usuario cambió de carpeta, no pintamos el listado.
  if (estado.pila[estado.pila.length - 1] !== actual) {
    return;
  }

  pintarListado(contenedor, estado, entradas, areaId);
}

function pintarListado(contenedor, estado, entradas, areaId) {
  const lista = document.createElement('div');
  lista.className = 'explorador-lista';

  const cabecera = document.createElement('div');
  cabecera.className = 'explorador-cabecera';
  cabecera.innerHTML = `
    <span>Nombre</span>
    <span>Tipo</span>
    <span>Tamaño</span>
    <span>Modificado</span>
  `;
  lista.appendChild(cabecera);

  entradas.forEach((entrada) => {
    const fila = document.createElement('div');
    fila.className = 'explorador-fila';
    fila.title = entrada.nombre;

    if (estado.seleccionado === entrada.nombre) {
      fila.classList.add('seleccionada');
    }

    const icono = entrada.esCarpeta ? '📁' : iconoDeArchivo(entrada.nombre);
    const extension = extensionDeArchivo(entrada.nombre);
    const tipo = entrada.esCarpeta
      ? 'Carpeta'
      : extension
        ? extension.toUpperCase()
        : 'Archivo';

    fila.innerHTML = `
      <span class="explorador-nombre"><span class="explorador-icono">${icono}</span><span>${escaparHtml(entrada.nombre)}</span></span>
      <span class="explorador-celda">${tipo}</span>
      <span class="explorador-celda">${entrada.esCarpeta ? '' : formatoTamano(entrada.size)}</span>
      <span class="explorador-celda">${entrada.esCarpeta ? '' : formatoFecha(entrada.mtime)}</span>
    `;

    fila.addEventListener('click', () => {
      if (entrada.esCarpeta) {
        estado.pila.push({ handle: entrada.handle, nombre: entrada.nombre });
        estado.seleccionado = null;
        renderizarExplorador(contenedor, areaId);
      } else {
        estado.seleccionado = entrada.nombre;
        [...lista.querySelectorAll('.explorador-fila')].forEach((f) =>
          f.classList.remove('seleccionada')
        );
        fila.classList.add('seleccionada');
        contenedor.querySelector('.explorador-pie').textContent =
          `${entrada.nombre} · ${formatoTamano(entrada.size)}`;
      }
    });

    lista.appendChild(fila);
  });

  const contenido = contenedor.querySelector('.explorador-contenido');
  contenido.innerHTML = '';
  contenido.appendChild(lista);
  contenedor.querySelector('.explorador-pie').textContent =
    `${entradas.length} elementos`;
}

async function listarDirectorio(handleDirectorio) {
  const entradas = [];

  for await (const [nombre, handle] of handleDirectorio.entries()) {
    entradas.push({ nombre, handle });
  }

  entradas.sort((a, b) => {
    const carpetaA = a.handle.kind === 'directory' ? 0 : 1;
    const carpetaB = b.handle.kind === 'directory' ? 0 : 1;
    if (carpetaA !== carpetaB) {
      return carpetaA - carpetaB;
    }
    return a.nombre.localeCompare(b.nombre, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });

  return Promise.all(
    entradas.map(async (entrada) => {
      const esCarpeta = entrada.handle.kind === 'directory';
      let size = null;
      let mtime = null;

      if (!esCarpeta) {
        try {
          const archivo = await entrada.handle.getFile();
          size = archivo.size;
          mtime = archivo.lastModified;
        } catch (error) {
          // Si un archivo no se puede leer, se muestra sin metadatos.
        }
      }

      return {
        nombre: entrada.nombre,
        handle: entrada.handle,
        esCarpeta,
        size,
        mtime,
      };
    })
  );
}

function iconoDeArchivo(nombre) {
  const extension = extensionDeArchivo(nombre);
  const mapa = {
    png: '🖼️',
    jpg: '🖼️',
    jpeg: '🖼️',
    gif: '🖼️',
    bmp: '🖼️',
    svg: '🖼️',
    webp: '🖼️',
    ico: '🖼️',
    pdf: '📕',
    txt: '📄',
    md: '📄',
    json: '📄',
    log: '📄',
    csv: '📊',
    js: '📜',
    ts: '📜',
    jsx: '📜',
    tsx: '📜',
    html: '🌐',
    htm: '🌐',
    css: '🎨',
    zip: '🗜️',
    rar: '🗜️',
    '7z': '🗜️',
    tar: '🗜️',
    gz: '🗜️',
    mp3: '🎵',
    wav: '🎵',
    ogg: '🎵',
    mp4: '🎬',
    mov: '🎬',
    avi: '🎬',
    mkv: '🎬',
    doc: '📘',
    docx: '📘',
    xls: '📗',
    xlsx: '📗',
    ppt: '📙',
    pptx: '📙',
    exe: '⚙️',
    msi: '⚙️',
    dll: '⚙️',
  };
  return mapa[extension] || '📄';
}

function extensionDeArchivo(nombre) {
  const indice = nombre.lastIndexOf('.');
  if (indice === -1) {
    return '';
  }
  return nombre.slice(indice + 1).toLowerCase();
}

function formatoTamano(bytes) {
  if (bytes === null || bytes === undefined) {
    return '';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const unidades = ['KB', 'MB', 'GB', 'TB'];
  let valor = bytes;
  let indice = -1;
  do {
    valor /= 1024;
    indice += 1;
  } while (valor >= 1024 && indice < unidades.length - 1);
  return `${valor.toFixed(valor >= 100 ? 0 : 1)} ${unidades[indice]}`;
}

function formatoFecha(marcaTiempo) {
  if (!marcaTiempo) {
    return '';
  }
  const fecha = new Date(marcaTiempo);
  const dia = fecha.toLocaleDateString();
  const hora = fecha.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dia} ${hora}`;
}

function escaparHtml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ----------------------------------------------------------------------------
// Tabla de datos de un módulo (vista previa con datos de ejemplo)
// ----------------------------------------------------------------------------

function renderizarTabla(contenedor, modulo, tabla) {
  const cabecera = tabla.columnas
    .map((columna) => `<th>${columna.etiqueta}</th>`)
    .join('');

  contenedor.innerHTML = `
    <div class="tabla-modulo">
      <div class="tabla-encabezado">
        <span class="tabla-titulo">${modulo.icono} ${modulo.nombre}</span>
        <span class="tabla-contador"></span>
      </div>
      <div class="tabla-buscador">
        <span class="tabla-buscador-icono">🔍</span>
        <input
          type="text"
          class="tabla-buscador-input"
          placeholder="Buscar en ${modulo.nombre}…"
          autocomplete="off"
          spellcheck="false"
        />
      </div>
      <div class="tabla-scroll">
        <table>
          <thead><tr>${cabecera}</tr></thead>
          <tbody></tbody>
        </table>
        <div class="tabla-vacia">Escribe para buscar coincidencias</div>
      </div>
    </div>
  `;

  const contador = contenedor.querySelector('.tabla-contador');
  const tbody = contenedor.querySelector('tbody');
  const vacia = contenedor.querySelector('.tabla-vacia');
  const input = contenedor.querySelector('.tabla-buscador-input');

  const pintarFilas = (filas) => {
    tbody.innerHTML = filas
      .map((fila) => {
        const celdas = tabla.columnas
          .map((columna) => {
            return `<td>${formatearCelda(columna, fila[columna.clave])}</td>`;
          })
          .join('');
        return `<tr>${celdas}</tr>`;
      })
      .join('');
    vacia.hidden = filas.length > 0;
  };

  // Estado inicial: área vacía, a la espera de que el usuario busque.
  contador.textContent = `${tabla.filas.length} registros`;
  pintarFilas([]);

  input.addEventListener('input', () => {
    const consulta = normalizar(input.value.trim());

    if (!consulta) {
      contador.textContent = `${tabla.filas.length} registros`;
      vacia.textContent = 'Escribe para buscar coincidencias';
      pintarFilas([]);
      return;
    }

    const coincidencias = tabla.filas.filter((fila) =>
      tabla.columnas.some((columna) =>
        normalizar(String(fila[columna.clave] ?? '')).includes(consulta)
      )
    );

    contador.textContent = `${coincidencias.length} coincidencias`;
    vacia.textContent = 'Sin coincidencias';
    pintarFilas(coincidencias);
  });
}

// Normaliza texto para búsquedas: sin tildes, sin signos diacríticos y en
// minúsculas, para que "produccion" encuentre "Producción".
function normalizar(texto) {
  return String(texto)
    .normalize('NFD')
    .split('')
    .filter((caracter) => {
      const codigo = caracter.codePointAt(0);
      return codigo < 0x0300 || codigo > 0x036f;
    })
    .join('')
    .toLowerCase();
}

// Genera el HTML completo (con todas las filas) de un módulo, para imprimir.
export function htmlTablaParaImprimir(id) {
  const tabla = TABLAS[id];
  if (!tabla) {
    return '';
  }

  const modulo = obtenerModulo(id);
  const cabecera = tabla.columnas
    .map((columna) => `<th>${columna.etiqueta}</th>`)
    .join('');

  const filas = tabla.filas
    .map((fila) => {
      const celdas = tabla.columnas
        .map((columna) => {
          return `<td>${formatearCelda(columna, fila[columna.clave])}</td>`;
        })
        .join('');
      return `<tr>${celdas}</tr>`;
    })
    .join('');

  return `
    <div class="tabla-modulo">
      <div class="tabla-encabezado">
        <span class="tabla-titulo">${modulo.icono} ${modulo.nombre}</span>
        <span class="tabla-contador">${tabla.filas.length} registros</span>
      </div>
      <div class="tabla-scroll">
        <table>
          <thead><tr>${cabecera}</tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    </div>
  `;
}

function formatearCelda(columna, valor) {
  if (columna.tipo === 'estado') {
    return `<span class="estado ${claseEstado(valor)}">${escaparHtml(valor)}</span>`;
  }
  if (columna.tipo === 'moneda') {
    return `€ ${Number(valor).toFixed(2)}`;
  }
  if (columna.tipo === 'fecha') {
    return escaparHtml(formatoFechaCorta(valor));
  }
  return escaparHtml(valor ?? '');
}

function claseEstado(valor) {
  const texto = String(valor).toLowerCase();
  if (texto.includes('disponible') || texto.includes('confirmado')) {
    return 'estado-ok';
  }
  if (texto.includes('producción') || texto.includes('uso')) {
    return 'estado-azul';
  }
  if (texto.includes('pendiente')) {
    return 'estado-gris';
  }
  if (texto.includes('mantenimiento')) {
    return 'estado-naranja';
  }
  return 'estado-gris';
}

function formatoFechaCorta(valor) {
  if (!valor) {
    return '';
  }
  const partes = String(valor).split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return String(valor);
}
