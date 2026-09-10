// ============================================================================
// app.js
// Punto de entrada de la aplicación.
// Inicializa el motor de áreas, construye las pestañas de workspaces y
// actualiza la barra de estado con el número de áreas visibles.
// ============================================================================

import { GestorAreas, WORKSPACES } from './area-engine.js';

// Referencias a los elementos principales de la interfaz.
const escenario = document.getElementById('escenario');
const contenedorWorkspaces = document.getElementById('workspaces');
const textoEstado = document.getElementById('texto-estado');
const botonRestablecer = document.getElementById('boton-restablecer');

// Crea el gestor de áreas. El layout se carga desde localStorage si existe
// y, en caso contrario, se usa el layout principal por defecto.
const gestor = new GestorAreas(escenario, {
  alCambiar: () => {
    textoEstado.textContent = `${gestor.contarAreas()} áreas · 7 módulos disponibles`;
  },
});

// Construye las pestañas de workspaces (equivale a las pestañas de Blender).
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
  });

  contenedorWorkspaces.appendChild(boton);
});

// Resalta la pestaña del workspace seleccionado y desmarca el resto.
function marcarWorkspaceActivo(botonActivo) {
  contenedorWorkspaces
    .querySelectorAll('.pestana-workspace')
    .forEach((boton) => {
      boton.classList.remove('activa');
    });
  botonActivo.classList.add('activa');
}

// Restablece el layout por defecto y muestra una confirmación visual.
botonRestablecer.addEventListener('click', () => {
  gestor.restablecer();
  const primerWorkspace =
    contenedorWorkspaces.querySelector('.pestana-workspace');
  if (primerWorkspace) {
    marcarWorkspaceActivo(primerWorkspace);
  }

  textoEstado.textContent = 'Layout restablecido ✓';
  setTimeout(() => {
    textoEstado.textContent = `${gestor.contarAreas()} áreas · 7 módulos disponibles`;
  }, 1200);
});
