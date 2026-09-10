// ============================================================================
// area-engine.js
// Motor de áreas estilo Blender.
//
// El layout de la ventana se representa como un árbol binario:
//   - Nodo "hoja":     un área que muestra un módulo concreto.
//   - Nodo "division": una separación entre dos sub-layouts (fila o columna)
//                      con un ratio que indica cuánto ocupa la primera parte.
//
// Capacidades implementadas:
//   - Redimensionar: arrastrar el divisor entre dos áreas.
//   - Dividir:       arrastrar una esquina de un área hacia dentro.
//   - Unir:          clic derecho sobre un divisor y elegir qué lado se mantiene.
//   - Cambiar módulo: selector desplegable en la cabecera de cada área.
//   - Persistencia:  el árbol se guarda en localStorage y se restaura al abrir.
// ============================================================================

import { MODULOS, obtenerModulo, renderizarModulo } from './modules.js';

// Clave usada para guardar/recuperar el layout en localStorage.
const CLAVE_ALMACENAMIENTO = 'fabrica-layout-v1';

// Grosor (en píxeles) del divisor arrastrable entre dos áreas.
const GROSOR_DIVISOR = 6;

// Distancia mínima (en píxeles) de arrastre para dividir un área desde su esquina.
const UMBRAL_DIVISION = 10;

// Distancia mínima (en píxeles) más allá del borde para fusionar con el área adyacente.
const UMBRAL_FUSION = 12;

// Direcciones de división del layout.
const FILA = 'fila'; // Los hijos se colocan uno al lado del otro (izquierda/derecha).
const COLUMNA = 'columna'; // Los hijos se colocan uno encima del otro (arriba/abajo).

// Contador auxiliar para generar identificadores únicos de nodo.
let contadorIds = 0;

// Genera un identificador único para un nodo del árbol.
function generarId() {
  contadorIds += 1;
  return `nodo-${Date.now()}-${contadorIds}`;
}

// Crea un nodo hoja (área) que muestra el módulo indicado.
function crearHoja(editorId) {
  return { id: generarId(), tipo: 'hoja', editor: editorId };
}

// Crea un nodo de división entre dos sub-layouts.
function crearDivision(direccion, primera, segunda, ratio) {
  return {
    id: generarId(),
    tipo: 'division',
    direccion,
    ratio,
    primera,
    segunda,
  };
}

// Construye una división en "fila" repartiendo el espacio equitativamente
// entre la lista de editores indicada.
function filaDeHojas(editores) {
  if (editores.length === 1) {
    return crearHoja(editores[0]);
  }
  const mitad = Math.floor(editores.length / 2);
  const primera = filaDeHojas(editores.slice(0, mitad));
  const segunda = filaDeHojas(editores.slice(mitad));
  return crearDivision(FILA, primera, segunda, mitad / editores.length);
}

// Construye una división en "columna" repartiendo el espacio equitativamente
// entre la lista de editores indicada.
function columnaDeHojas(editores) {
  if (editores.length === 1) {
    return crearHoja(editores[0]);
  }
  const mitad = Math.floor(editores.length / 2);
  const primera = columnaDeHojas(editores.slice(0, mitad));
  const segunda = columnaDeHojas(editores.slice(mitad));
  return crearDivision(COLUMNA, primera, segunda, mitad / editores.length);
}

// Layout por defecto, inspirado en la distribución clásica de Blender:
// una zona grande de trabajo, una columna lateral y una franja inferior.
function crearLayoutPrincipal() {
  const columnaDerecha = crearDivision(
    COLUMNA,
    crearHoja('empleados'),
    crearHoja('clientes'),
    0.5
  );
  const filaSuperior = crearDivision(
    FILA,
    crearHoja('pedidos'),
    columnaDerecha,
    0.66
  );
  const filaInferior = filaDeHojas([
    'articulos',
    'troqueles',
    'proveedores',
    'cliches',
  ]);
  return crearDivision(COLUMNA, filaSuperior, filaInferior, 0.72);
}

// Workspaces predefinidos, equivalentes a las pestañas superiores de Blender.
// Cada workspace tiene una función que genera un árbol nuevo e independiente.
export const WORKSPACES = [
  { id: 'principal', nombre: 'Principal', crear: crearLayoutPrincipal },
  {
    id: 'dos-columnas',
    nombre: 'Dos columnas',
    crear: () =>
      crearDivision(FILA, crearHoja('empleados'), crearHoja('clientes'), 0.5),
  },
  {
    id: 'cuatro-cuadrantes',
    nombre: 'Cuatro cuadrantes',
    crear: () =>
      crearDivision(
        COLUMNA,
        filaDeHojas(['empleados', 'clientes']),
        filaDeHojas(['pedidos', 'proveedores']),
        0.5
      ),
  },
  {
    id: 'apilado',
    nombre: 'Apilado',
    crear: () => columnaDeHojas(['empleados', 'pedidos', 'articulos']),
  },
  {
    id: 'foco',
    nombre: 'Foco',
    crear: () => crearHoja('pedidos'),
  },
];

// ============================================================================
// GestorAreas
// Clase principal que gestiona el árbol del layout y lo refleja en el DOM.
// ============================================================================
export class GestorAreas {
  constructor(contenedor, opciones = {}) {
    this.contenedor = contenedor;
    this.arbol = this.cargar() || crearLayoutPrincipal();
    this.alCambiar = opciones.alCambiar || (() => {});
    this.menu = this.crearMenuContextual();
    this.renderizar();
  }

  // Intenta recuperar el layout guardado. Devuelve null si no hay datos válidos.
  cargar() {
    try {
      const crudo = localStorage.getItem(CLAVE_ALMACENAMIENTO);
      if (!crudo) {
        return null;
      }
      const arbol = JSON.parse(crudo);
      if (arbol && (arbol.tipo === 'hoja' || arbol.tipo === 'division')) {
        return arbol;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Guarda el árbol actual en localStorage.
  guardar() {
    try {
      localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(this.arbol));
    } catch (error) {
      // Si el almacenamiento no está disponible, simplemente se ignora.
    }
  }

  // Reconstruye todo el DOM a partir del árbol actual.
  renderizar() {
    this.contenedor.innerHTML = '';
    this.contenedor.appendChild(this.construirNodo(this.arbol));
    this.alCambiar(this.arbol);
  }

  // Devuelve el número total de áreas (hojas) del layout.
  contarAreas() {
    return this.contarHojas(this.arbol);
  }

  contarHojas(nodo) {
    if (!nodo) {
      return 0;
    }
    if (nodo.tipo === 'hoja') {
      return 1;
    }
    return this.contarHojas(nodo.primera) + this.contarHojas(nodo.segunda);
  }

  // Busca un nodo por su id recorriendo el árbol en profundidad.
  buscarNodo(nodo, id) {
    if (!nodo) {
      return null;
    }
    if (nodo.id === id) {
      return nodo;
    }
    if (nodo.tipo === 'division') {
      return (
        this.buscarNodo(nodo.primera, id) || this.buscarNodo(nodo.segunda, id)
      );
    }
    return null;
  }

  // Busca un nodo por id y devuelve también su padre y la clave bajo la que cuelga.
  // Útil para sustituir un nodo dentro del árbol.
  buscarPadre(nodo, id, padre = null, clave = null) {
    if (nodo.id === id) {
      return { padre, clave };
    }
    if (nodo.tipo === 'division') {
      const izquierda = this.buscarPadre(nodo.primera, id, nodo, 'primera');
      if (izquierda) {
        return izquierda;
      }
      return this.buscarPadre(nodo.segunda, id, nodo, 'segunda');
    }
    return null;
  }

  // Divide un área creando una nueva área adyacente según la esquina arrastrada.
  // El parámetro ratio (0..1) define cuánto ocupa la primera parte de la división.
  //   - tl (superior izquierda): nueva área arriba.
  //   - tr (superior derecha):   nueva área a la derecha.
  //   - bl (inferior izquierda): nueva área a la izquierda.
  //   - br (inferior derecha):   nueva área abajo.
  dividirArea(idArea, esquina, ratio = 0.5) {
    const encontrado = this.buscarPadre(this.arbol, idArea);
    const hoja = encontrado.padre
      ? encontrado.padre[encontrado.clave]
      : this.arbol;
    const nuevaHoja = crearHoja(hoja.editor);

    let nuevaDivision;
    if (esquina === 'tl') {
      nuevaDivision = crearDivision(COLUMNA, nuevaHoja, hoja, ratio);
    } else if (esquina === 'tr') {
      nuevaDivision = crearDivision(FILA, hoja, nuevaHoja, ratio);
    } else if (esquina === 'bl') {
      nuevaDivision = crearDivision(FILA, nuevaHoja, hoja, ratio);
    } else {
      nuevaDivision = crearDivision(COLUMNA, hoja, nuevaHoja, ratio);
    }

    if (encontrado.padre) {
      encontrado.padre[encontrado.clave] = nuevaDivision;
    } else {
      this.arbol = nuevaDivision;
    }

    this.renderizar();
    this.guardar();
  }

  // Une dos áreas hermanas conservando uno de los dos lados de la división.
  unirDivision(idDivision, lado) {
    const encontrado = this.buscarPadre(this.arbol, idDivision);
    const division = encontrado.padre
      ? encontrado.padre[encontrado.clave]
      : this.arbol;
    const resultado = lado === 'primera' ? division.primera : division.segunda;

    if (encontrado.padre) {
      encontrado.padre[encontrado.clave] = resultado;
    } else {
      this.arbol = resultado;
    }

    this.renderizar();
    this.guardar();
  }

  // Cambia el módulo mostrado por un área concreta.
  cambiarEditor(idArea, editorId) {
    const hoja = this.buscarNodo(this.arbol, idArea);
    if (hoja && hoja.tipo === 'hoja') {
      hoja.editor = editorId;
    }
    this.renderizar();
    this.guardar();
  }

  // Aplica un workspace (árbol nuevo) y lo persiste.
  aplicarWorkspace(arbol) {
    this.arbol = arbol;
    this.renderizar();
    this.guardar();
  }

  // Restablece el layout por defecto y lo persiste.
  restablecer() {
    this.arbol = crearLayoutPrincipal();
    this.renderizar();
    this.guardar();
  }

  // --------------------------------------------------------------------------
  // Construcción del DOM a partir del árbol
  // --------------------------------------------------------------------------
  construirNodo(nodo) {
    if (nodo.tipo === 'hoja') {
      return this.construirArea(nodo);
    }
    return this.construirDivision(nodo);
  }

  construirArea(nodo) {
    const modulo = obtenerModulo(nodo.editor);
    const area = document.createElement('section');
    area.className = 'area';
    area.dataset.areaId = nodo.id;
    area.style.setProperty('--acento', modulo.color);

    area.innerHTML = `
      <header class="area-encabezado">
        <span class="area-titulo">${modulo.icono} ${modulo.nombre}</span>
        <select class="selector-editor" title="Cambiar módulo del área"></select>
        <button type="button" class="boton-menu-area" title="Opciones del área">⋯</button>
      </header>
      <div class="area-cuerpo"></div>
      <span
        class="esquina esquina-tl"
        title="Arrastra hacia dentro para dividir · hacia fuera para unir"
      ></span>
      <span
        class="esquina esquina-tr"
        title="Arrastra hacia dentro para dividir · hacia fuera para unir"
      ></span>
      <span
        class="esquina esquina-bl"
        title="Arrastra hacia dentro para dividir · hacia fuera para unir"
      ></span>
      <span
        class="esquina esquina-br"
        title="Arrastra hacia dentro para dividir · hacia fuera para unir"
      ></span>
    `;

    // Rellena el selector de módulos con todas las opciones disponibles.
    const selector = area.querySelector('.selector-editor');
    MODULOS.forEach((opcion) => {
      const elemento = document.createElement('option');
      elemento.value = opcion.id;
      elemento.textContent = `${opcion.icono} ${opcion.nombre}`;
      if (opcion.id === nodo.editor) {
        elemento.selected = true;
      }
      selector.appendChild(elemento);
    });

    // Cambia el módulo del área al seleccionar otra opción.
    selector.addEventListener('change', () => {
      this.cambiarEditor(nodo.id, selector.value);
    });

    // Menú de opciones del área (dividir a la derecha o abajo).
    area
      .querySelector('.boton-menu-area')
      .addEventListener('click', (evento) => {
        evento.stopPropagation();
        const rect = evento.currentTarget.getBoundingClientRect();
        this.mostrarMenu(rect.left, rect.bottom + 4, [
          {
            texto: 'Dividir · nueva área a la derecha',
            accion: () => this.dividirArea(nodo.id, 'tr'),
          },
          {
            texto: 'Dividir · nueva área abajo',
            accion: () => this.dividirArea(nodo.id, 'br'),
          },
        ]);
      });

    // Pinta la maqueta del módulo dentro del cuerpo del área.
    renderizarModulo(nodo.editor, area.querySelector('.area-cuerpo'));

    // Asigna el comportamiento de arrastre a cada esquina (dividir o fusionar).
    area
      .querySelector('.esquina-tl')
      .addEventListener('pointerdown', (evento) => {
        this.iniciarArrastreEsquina(evento, nodo.id, 'tl');
      });
    area
      .querySelector('.esquina-tr')
      .addEventListener('pointerdown', (evento) => {
        this.iniciarArrastreEsquina(evento, nodo.id, 'tr');
      });
    area
      .querySelector('.esquina-bl')
      .addEventListener('pointerdown', (evento) => {
        this.iniciarArrastreEsquina(evento, nodo.id, 'bl');
      });
    area
      .querySelector('.esquina-br')
      .addEventListener('pointerdown', (evento) => {
        this.iniciarArrastreEsquina(evento, nodo.id, 'br');
      });

    return area;
  }

  construirDivision(nodo) {
    const contenedor = document.createElement('div');
    contenedor.className = 'division';
    contenedor.dataset.direccion = nodo.direccion;
    contenedor.dataset.divisionId = nodo.id;

    const hijoUno = document.createElement('div');
    hijoUno.className = 'division-hijo';
    hijoUno.style.flexGrow = String(nodo.ratio);
    hijoUno.appendChild(this.construirNodo(nodo.primera));

    const divisor = document.createElement('div');
    divisor.className = 'divisor';
    divisor.title = 'Arrastra para redimensionar · clic derecho para unir';

    const hijoDos = document.createElement('div');
    hijoDos.className = 'division-hijo';
    hijoDos.style.flexGrow = String(1 - nodo.ratio);
    hijoDos.appendChild(this.construirNodo(nodo.segunda));

    contenedor.appendChild(hijoUno);
    contenedor.appendChild(divisor);
    contenedor.appendChild(hijoDos);

    // Redimensionar arrastrando el divisor.
    divisor.addEventListener('pointerdown', (evento) => {
      this.iniciarRedimension(evento, nodo.id, contenedor, hijoUno, hijoDos);
    });

    // Menú contextual para unir las dos áreas.
    divisor.addEventListener('contextmenu', (evento) => {
      evento.preventDefault();
      const direccion = nodo.direccion;
      const etiquetaUno =
        direccion === FILA ? 'Mantener izquierda' : 'Mantener arriba';
      const etiquetaDos =
        direccion === FILA ? 'Mantener derecha' : 'Mantener abajo';
      this.mostrarMenu(evento.clientX, evento.clientY, [
        {
          texto: `Unir áreas · ${etiquetaUno}`,
          accion: () => this.unirDivision(nodo.id, 'primera'),
        },
        {
          texto: `Unir áreas · ${etiquetaDos}`,
          accion: () => this.unirDivision(nodo.id, 'segunda'),
        },
      ]);
    });

    return contenedor;
  }

  // --------------------------------------------------------------------------
  // Interacciones de arrastre (Pointer Events)
  // --------------------------------------------------------------------------

  // Redimensiona un divisor actualizando el ratio en tiempo real.
  iniciarRedimension(evento, idDivision, contenedor, hijoUno, hijoDos) {
    evento.preventDefault();
    const divisor = evento.currentTarget;
    divisor.setPointerCapture(evento.pointerId);

    const alMover = (movimiento) => {
      const rect = contenedor.getBoundingClientRect();
      let ratio;
      if (contenedor.dataset.direccion === FILA) {
        ratio = (movimiento.clientX - rect.left) / rect.width;
      } else {
        ratio = (movimiento.clientY - rect.top) / rect.height;
      }
      ratio = Math.min(0.9, Math.max(0.1, ratio));

      const nodo = this.buscarNodo(this.arbol, idDivision);
      if (nodo) {
        nodo.ratio = ratio;
      }
      hijoUno.style.flexGrow = String(ratio);
      hijoDos.style.flexGrow = String(1 - ratio);
    };

    const alSoltar = () => {
      divisor.removeEventListener('pointermove', alMover);
      divisor.removeEventListener('pointerup', alSoltar);
      divisor.removeEventListener('pointercancel', alSoltar);
      this.guardar();
    };

    divisor.addEventListener('pointermove', alMover);
    divisor.addEventListener('pointerup', alSoltar);
    divisor.addEventListener('pointercancel', alSoltar);
  }

  // Gestiona el arrastre de una esquina con dos comportamientos, igual que Blender:
  //   - Arrastrar hacia el interior del área: divide el área en dos (la nueva
  //     ocupa el espacio hasta donde se ha arrastrado).
  //   - Arrastrar hacia fuera sobre un área adyacente: fusiona ambas áreas,
  //     conservando el área de origen.
  iniciarArrastreEsquina(evento, idArea, esquina) {
    evento.preventDefault();
    const esquinaEl = evento.currentTarget;
    esquinaEl.setPointerCapture(evento.pointerId);

    const areaEl = esquinaEl.closest('.area');
    const rect = areaEl.getBoundingClientRect();

    let accionPendiente = null; // 'dividir' | 'fusionar' | null
    let fusionPendiente = null; // { idDivision, lado }

    const alMover = (movimiento) => {
      const dentro =
        movimiento.clientX >= rect.left &&
        movimiento.clientX <= rect.right &&
        movimiento.clientY >= rect.top &&
        movimiento.clientY <= rect.bottom;

      if (!dentro) {
        // Fuera del área de origen: se intenta fusionar con el área adyacente.
        const fusion = this.resolverFusion(idArea, movimiento);
        this.limpiarPrevias();
        if (fusion) {
          accionPendiente = 'fusionar';
          fusionPendiente = fusion;
          this.marcarPreviaFusion(fusion.idDivision, fusion.lado);
        } else {
          accionPendiente = null;
          fusionPendiente = null;
        }
        return;
      }

      // Dentro del área de origen: si se arrastra lo suficiente, se divide.
      const distanciaX = movimiento.clientX - evento.clientX;
      const distanciaY = movimiento.clientY - evento.clientY;
      this.limpiarPrevias();
      if (Math.hypot(distanciaX, distanciaY) > UMBRAL_DIVISION) {
        accionPendiente = 'dividir';
        areaEl.classList.add('division-previa');
      } else {
        accionPendiente = null;
      }
    };

    const finalizar = (aplicar, movimiento) => {
      this.limpiarPrevias();
      esquinaEl.removeEventListener('pointermove', alMover);
      esquinaEl.removeEventListener('pointerup', alSoltar);
      esquinaEl.removeEventListener('pointercancel', alCancelar);

      if (!aplicar) {
        return;
      }
      if (accionPendiente === 'fusionar' && fusionPendiente) {
        this.unirDivision(fusionPendiente.idDivision, fusionPendiente.lado);
      } else if (accionPendiente === 'dividir') {
        const ratio = this.calcularRatioDivision(esquina, rect, movimiento);
        this.dividirArea(idArea, esquina, ratio);
      }
    };

    const alSoltar = (movimiento) => finalizar(true, movimiento);
    const alCancelar = () => finalizar(false);

    esquinaEl.addEventListener('pointermove', alMover);
    esquinaEl.addEventListener('pointerup', alSoltar);
    esquinaEl.addEventListener('pointercancel', alCancelar);
  }

  // Calcula el ratio de una división según hasta dónde se arrastró la esquina.
  calcularRatioDivision(esquina, rect, movimiento) {
    let ratio;
    if (esquina === 'tl' || esquina === 'br') {
      ratio = (movimiento.clientY - rect.top) / rect.height;
    } else {
      ratio = (movimiento.clientX - rect.left) / rect.width;
    }
    return Math.min(0.9, Math.max(0.1, ratio));
  }

  // Determina si, arrastrando la esquina fuera de su área, es posible fusionarla
  // con el área adyacente. Devuelve { idDivision, lado } o null si no hay fusión.
  resolverFusion(idArea, posicion) {
    const areaEl = this.contenedor.querySelector(`[data-area-id="${idArea}"]`);
    if (!areaEl) {
      return null;
    }
    const rect = areaEl.getBoundingClientRect();
    const encontrado = this.buscarPadre(this.arbol, idArea);
    if (!encontrado || !encontrado.padre) {
      return null;
    }

    const padre = encontrado.padre;
    const clave = encontrado.clave;

    if (padre.direccion === FILA) {
      if (posicion.clientX < rect.left - UMBRAL_FUSION && clave === 'segunda') {
        return { idDivision: padre.id, lado: 'segunda' };
      }
      if (
        posicion.clientX > rect.right + UMBRAL_FUSION &&
        clave === 'primera'
      ) {
        return { idDivision: padre.id, lado: 'primera' };
      }
    } else {
      if (posicion.clientY < rect.top - UMBRAL_FUSION && clave === 'segunda') {
        return { idDivision: padre.id, lado: 'segunda' };
      }
      if (
        posicion.clientY > rect.bottom + UMBRAL_FUSION &&
        clave === 'primera'
      ) {
        return { idDivision: padre.id, lado: 'primera' };
      }
    }
    return null;
  }

  // Resalta el sub-layout que será absorbido durante una fusión.
  marcarPreviaFusion(idDivision, ladoMantener) {
    const division = this.buscarNodo(this.arbol, idDivision);
    if (!division) {
      return;
    }
    const absorbido =
      ladoMantener === 'primera' ? division.segunda : division.primera;
    const elemento = this.elementoDeNodo(absorbido);
    if (elemento) {
      elemento.classList.add('fusion-previa');
    }
  }

  // Devuelve el elemento DOM raíz correspondiente a un nodo del árbol.
  elementoDeNodo(nodo) {
    if (!nodo) {
      return null;
    }
    if (nodo.tipo === 'hoja') {
      return this.contenedor.querySelector(`[data-area-id="${nodo.id}"]`);
    }
    return this.contenedor.querySelector(`[data-division-id="${nodo.id}"]`);
  }

  // Elimina los resaltados de vista previa de división y fusión.
  limpiarPrevias() {
    this.contenedor
      .querySelectorAll('.division-previa, .fusion-previa')
      .forEach((elemento) => {
        elemento.classList.remove('division-previa', 'fusion-previa');
      });
  }

  // --------------------------------------------------------------------------
  // Menú contextual flotante
  // --------------------------------------------------------------------------
  crearMenuContextual() {
    const menu = document.createElement('div');
    menu.className = 'menu-contextual';
    document.body.appendChild(menu);

    // Cierra el menú al hacer clic fuera de él.
    document.addEventListener('click', (evento) => {
      if (!menu.contains(evento.target)) {
        this.ocultarMenu();
      }
    });

    return menu;
  }

  mostrarMenu(x, y, items) {
    this.menu.innerHTML = '';
    items.forEach((item) => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'menu-item';
      boton.textContent = item.texto;
      boton.addEventListener('click', () => {
        this.ocultarMenu();
        item.accion();
      });
      this.menu.appendChild(boton);
    });

    this.menu.style.left = `${x}px`;
    this.menu.style.top = `${y}px`;
    this.menu.classList.add('visible');
  }

  ocultarMenu() {
    this.menu.classList.remove('visible');
  }
}
