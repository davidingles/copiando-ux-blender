// ============================================================================
// app.js
// Punto de entrada de la aplicación.
// Inicializa el motor de áreas, construye las pestañas de workspaces,
// gestiona las configuraciones guardadas con nombre y actualiza la barra
// de estado con el número de áreas visibles.
// ============================================================================

import { GestorAreas, WORKSPACES } from './area-engine.js';

// Referencias a los elementos principales de la interfaz.
const escenario = document.getElementById('escenario');
const contenedorWorkspaces = document.getElementById('workspaces');
const contenedorConfiguraciones = document.getElementById('configuraciones');
const textoEstado = document.getElementById('texto-estado');
const botonRestablecer = document.getElementById('boton-restablecer');
const botonEnfocar = document.getElementById('boton-enfocar');
const botonDesenfocar = document.getElementById('boton-desenfocar');
const modalConfig = document.getElementById('modal-config');
const inputNombreConfig = document.getElementById('input-nombre-config');
const botonCancelarConfig = document.getElementById('boton-cancelar-config');
const botonAceptarConfig = document.getElementById('boton-aceptar-config');
const botonTema = document.getElementById('boton-tema');

// Clave usada para guardar/recuperar las configuraciones con nombre.
const CLAVE_CONFIGURACIONES = 'fabrica-configuraciones-v1';

// Crea el gestor de áreas. El layout se carga desde localStorage si existe
// y, en caso contrario, se usa el layout principal por defecto.
// Se usa una variable reasignable porque el constructor invoca `alCambiar`
// durante su ejecución, antes de que la asignación termine.
let gestor;
gestor = new GestorAreas(escenario, {
  alCambiar: () => {
    actualizarBotones();
    textoEstado.textContent = gestor
      ? `${gestor.contarAreas()} áreas · 7 módulos disponibles`
      : '';
  },
});

// Muestra u oculta los botones de enfocar/desenfocar según el estado:
//   - "Enfocar" (azul): visible cuando hay un área con foco y no está ampliada.
//   - "Desenfocar" (rojo): visible cuando el área está ampliada.
function actualizarBotones() {
  const ampliada = gestor && gestor.maximizada;
  const hayFoco = gestor && gestor.areaEnfocada;

  botonEnfocar.hidden = !(!ampliada && hayFoco);
  botonDesenfocar.hidden = !ampliada;
}

// ----------------------------------------------------------------------------
// Configuraciones guardadas con nombre (instantáneas del layout actual)
// ----------------------------------------------------------------------------

// Carga la lista de configuraciones desde localStorage.
function cargarConfiguraciones() {
  try {
    const crudo = localStorage.getItem(CLAVE_CONFIGURACIONES);
    const lista = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(lista) ? lista : [];
  } catch (error) {
    return [];
  }
}

// Guarda la lista de configuraciones en localStorage.
function guardarConfiguraciones(lista) {
  try {
    localStorage.setItem(CLAVE_CONFIGURACIONES, JSON.stringify(lista));
  } catch (error) {
    // Sin almacenamiento disponible: se ignora.
  }
}

// Genera un identificador único para una configuración.
function generarIdConfig() {
  return `config-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Repinta las pestañas de configuraciones guardadas y el botón "+" final.
function renderizarConfiguraciones() {
  const configuraciones = cargarConfiguraciones();

  contenedorConfiguraciones.innerHTML = '';

  configuraciones.forEach((config) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'pestana-config';
    boton.dataset.configId = config.id;
    boton.textContent = config.nombre;
    boton.title = 'Aplicar esta configuración';

    boton.addEventListener('click', () => {
      aplicarConfiguracion(config.id);
    });

    contenedorConfiguraciones.appendChild(boton);
  });

  // Botón "+" para guardar la configuración actual (siempre al final).
  const botonGuardar = document.createElement('button');
  botonGuardar.type = 'button';
  botonGuardar.className = 'boton-mas';
  botonGuardar.title = 'Guardar la configuración actual de las áreas';
  botonGuardar.textContent = '+';
  botonGuardar.addEventListener('click', abrirModalGuardar);
  contenedorConfiguraciones.appendChild(botonGuardar);
}

// Marca como activa la configuración indicada y desmarca el resto.
function marcarConfigActiva(idActivo) {
  contenedorConfiguraciones
    .querySelectorAll('.pestana-config')
    .forEach((boton) => {
      boton.classList.toggle('activa', boton.dataset.configId === idActivo);
    });
}

// Aplica una configuración guardada: restaura las áreas y sus módulos.
function aplicarConfiguracion(id) {
  const config = cargarConfiguraciones().find((c) => c.id === id);
  if (!config || !config.arbol) {
    return;
  }

  gestor.aplicarWorkspace(config.arbol);
  marcarConfigActiva(id);
  marcarWorkspaceActivo(null);

  textoEstado.textContent = `Configuración «${config.nombre}» aplicada ✓`;
  setTimeout(() => {
    textoEstado.textContent = `${gestor.contarAreas()} áreas · 7 módulos disponibles`;
  }, 1200);
}

// Abre el diálogo para poner nombre y guardar la configuración actual.
function abrirModalGuardar() {
  inputNombreConfig.value = '';
  modalConfig.hidden = false;
  inputNombreConfig.focus();
}

// Cierra el diálogo sin guardar.
function cerrarModalGuardar() {
  modalConfig.hidden = true;
}

// Guarda la configuración actual con el nombre introducido.
function guardarConfiguracionActual() {
  const nombre = inputNombreConfig.value.trim();
  const configuraciones = cargarConfiguraciones();

  // Si no se escribe nombre, se genera uno por defecto.
  const nombreFinal = nombre || `Configuración ${configuraciones.length + 1}`;

  const nueva = {
    id: generarIdConfig(),
    nombre: nombreFinal,
    arbol: gestor.obtenerArbol(),
  };

  configuraciones.push(nueva);
  guardarConfiguraciones(configuraciones);
  renderizarConfiguraciones();
  marcarConfigActiva(nueva.id);
  cerrarModalGuardar();

  textoEstado.textContent = `Configuración «${nombreFinal}» guardada ✓`;
  setTimeout(() => {
    textoEstado.textContent = `${gestor.contarAreas()} áreas · 7 módulos disponibles`;
  }, 1200);
}

// ----------------------------------------------------------------------------
// Workspaces predefinidos (pestañas de Blender)
// ----------------------------------------------------------------------------

WORKSPACES.forEach((workspace, indice) => {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'pestana-workspace';
  boton.textContent = workspace.nombre;
  if (indice === 0) {
    boton.classList.add('activa');
  }

  boton.addEventListener('click', () => {
    gestor.aplicarWorkspace(workspace.crear());
    marcarWorkspaceActivo(boton);
    marcarConfigActiva(null);
  });

  contenedorWorkspaces.appendChild(boton);
});

// Resalta la pestaña del workspace seleccionado y desmarca el resto.
// Si se pasa null, desmarca todas las pestañas.
function marcarWorkspaceActivo(botonActivo) {
  contenedorWorkspaces
    .querySelectorAll('.pestana-workspace')
    .forEach((boton) => {
      boton.classList.toggle('activa', boton === botonActivo);
    });
}

// Restablece el layout por defecto y muestra una confirmación visual.
botonRestablecer.addEventListener('click', () => {
  gestor.restablecer();
  const primerWorkspace =
    contenedorWorkspaces.querySelector('.pestana-workspace');
  marcarWorkspaceActivo(primerWorkspace);
  marcarConfigActiva(null);

  textoEstado.textContent = 'Layout restablecido ✓';
  setTimeout(() => {
    textoEstado.textContent = `${gestor.contarAreas()} áreas · 7 módulos disponibles`;
  }, 1200);
});

// Amplía el área enfocada (mismo comportamiento que Ctrl+Espacio).
botonEnfocar.addEventListener('click', () => {
  gestor.alternarMaximizada();
});

// Deshace la ampliación del área (vuelve al layout anterior).
botonDesenfocar.addEventListener('click', () => {
  gestor.restaurarLayout();
});

// ----------------------------------------------------------------------------
// Eventos del diálogo de guardar configuración
// ----------------------------------------------------------------------------

botonAceptarConfig.addEventListener('click', guardarConfiguracionActual);
botonCancelarConfig.addEventListener('click', cerrarModalGuardar);

// Guardar con Enter y cancelar con Escape.
inputNombreConfig.addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter') {
    guardarConfiguracionActual();
  } else if (evento.key === 'Escape') {
    cerrarModalGuardar();
  }
});

// Cierra el diálogo al hacer clic sobre el fondo oscuro.
modalConfig.addEventListener('click', (evento) => {
  if (evento.target === modalConfig) {
    cerrarModalGuardar();
  }
});

// Pinta las configuraciones guardadas al arrancar.
renderizarConfiguraciones();

// ----------------------------------------------------------------------------
// Tema (modo oscuro / modo claro)
// ----------------------------------------------------------------------------

const CLAVE_TEMA = 'fabrica-tema';

// Aplica el tema indicado y lo guarda para la próxima visita.
function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema;
  // Muestra el icono del tema al que se cambiará al pulsar.
  botonTema.textContent = tema === 'claro' ? '🌙' : '☀️';
  botonTema.title =
    tema === 'claro' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
  try {
    localStorage.setItem(CLAVE_TEMA, tema);
  } catch (error) {
    // Sin almacenamiento disponible: se ignora.
  }
}

// Recupera el tema guardado (oscuro por defecto).
let temaActual = 'oscuro';
try {
  temaActual = localStorage.getItem(CLAVE_TEMA) || 'oscuro';
} catch (error) {
  // Sin almacenamiento: tema oscuro por defecto.
}
aplicarTema(temaActual);

botonTema.addEventListener('click', () => {
  const actual = document.documentElement.dataset.tema;
  aplicarTema(actual === 'claro' ? 'oscuro' : 'claro');
});
