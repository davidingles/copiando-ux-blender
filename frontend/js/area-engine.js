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

    // Estado del área enfocada (el "área activa" de Blender) y de la vista
    // maximizada que se alterna con Ctrl+Espacio.
    this.areaEnfocada = null;
    this.arbolPrevio = null;
    this.areaMaximizadaId = null;
    this.maximizada = false;

    this.menu = this.crearMenuContextual();
    this.renderizar();

    // Historial para deshacer (Ctrl+Z) y rehacer (Ctrl+Shift+Z).
    this.historial = [this.obtenerArbol()];
    this.indiceHistorial = 0;

    // Elemento de vista previa de la división durante el arrastre de esquinas.
    this.previewDivision = null;

    this.configurarAtajos();
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
    // La vista maximizada es un estado temporal: no se persiste.
    if (this.maximizada) {
      return;
    }
    try {
      localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(this.arbol));
    } catch (error) {
      // Si el almacenamiento no está disponible, simplemente se ignora.
    }
  }

  // Devuelve una copia independiente del árbol actual. Sirve para guardar
  // configuraciones con nombre sin compartir referencias con el layout vivo.
  obtenerArbol() {
    return JSON.parse(JSON.stringify(this.arbol));
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

  // Divide un área creando una nueva área adyacente.
  //   - direccion: FILA (lado a lado) o COLUMNA (arriba/abajo).
  //   - ratio (0..1): posición del divisor; coincide con lo que ocupa la
  //     primera parte (izquierda o arriba).
  //   - nuevaEnPrimera: si la nueva área queda como primera parte.
  dividirArea(idArea, direccion, ratio = 0.5, nuevaEnPrimera = false) {
    const encontrado = this.buscarPadre(this.arbol, idArea);
    const hoja = encontrado.padre
      ? encontrado.padre[encontrado.clave]
      : this.arbol;
    const nuevaHoja = crearHoja(hoja.editor);

    const nuevaDivision = nuevaEnPrimera
      ? crearDivision(direccion, nuevaHoja, hoja, ratio)
      : crearDivision(direccion, hoja, nuevaHoja, ratio);

    if (encontrado.padre) {
      encontrado.padre[encontrado.clave] = nuevaDivision;
    } else {
      this.arbol = nuevaDivision;
    }

    this.renderizar();
    this.guardar();
    this.registrarCambio();
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
    this.registrarCambio();
  }

  // Cambia el módulo mostrado por un área concreta.
  cambiarEditor(idArea, editorId) {
    const hoja = this.buscarNodo(this.arbol, idArea);
    if (hoja && hoja.tipo === 'hoja') {
      hoja.editor = editorId;
    }
    this.renderizar();
    this.guardar();
    this.registrarCambio();
  }

  // Aplica un workspace o configuración (árbol nuevo) y lo persiste.
  // Se clona el árbol para no mutar la fuente original al redimensionar.
  aplicarWorkspace(arbol) {
    this.arbol = JSON.parse(JSON.stringify(arbol));
    this.maximizada = false;
    this.arbolPrevio = null;
    this.areaMaximizadaId = null;
    this.areaEnfocada = null;
    this.renderizar();
    this.guardar();
    this.registrarCambio();
  }

  // Restablece el layout por defecto y lo persiste.
  restablecer() {
    this.arbol = crearLayoutPrincipal();
    this.maximizada = false;
    this.arbolPrevio = null;
    this.areaMaximizadaId = null;
    this.areaEnfocada = null;
    this.renderizar();
    this.guardar();
    this.registrarCambio();
  }

  // --------------------------------------------------------------------------
  // Historial: deshacer (Ctrl+Z) y rehacer (Ctrl+Shift+Z)
  // --------------------------------------------------------------------------

  // Registra el estado actual del layout en el historial.
  registrarCambio() {
    if (this.maximizada) {
      return;
    }
    const instantanea = this.obtenerArbol();
    this.historial = this.historial.slice(0, this.indiceHistorial + 1);
    this.historial.push(instantanea);
    this.indiceHistorial = this.historial.length - 1;
  }

  // Aplica un estado del historial sin registrar un nuevo cambio.
  aplicarEstado(arbol) {
    this.arbol = JSON.parse(JSON.stringify(arbol));
    this.maximizada = false;
    this.arbolPrevio = null;
    this.areaMaximizadaId = null;
    this.areaEnfocada = null;
    this.renderizar();
    this.guardar();
  }

  // Deshace la última operación.
  deshacer() {
    if (this.indiceHistorial <= 0) {
      return;
    }
    this.indiceHistorial -= 1;
    this.aplicarEstado(this.historial[this.indiceHistorial]);
  }

  // Rehace la última operación deshecha.
  rehacer() {
    if (this.indiceHistorial >= this.historial.length - 1) {
      return;
    }
    this.indiceHistorial += 1;
    this.aplicarEstado(this.historial[this.indiceHistorial]);
  }

  // --------------------------------------------------------------------------
  // Área enfocada y vista maximizada (Ctrl+Espacio, como en Blender)
  // --------------------------------------------------------------------------

  // Marca un área como activa (equivalente al área con foco de Blender).
  enfocarArea(idArea) {
    this.areaEnfocada = idArea;
    this.contenedor.querySelectorAll('.area').forEach((area) => {
      area.classList.toggle('enfocada', area.dataset.areaId === idArea);
    });
    // Notifica el cambio de foco para que la interfaz actualice sus controles
    // (por ejemplo, mostrar/ocultar el botón "Enfocar").
    this.alCambiar(this.arbol);
  }

  // Devuelve la primera hoja del árbol (para enfocar algo si no hay foco).
  primeraHoja(nodo = this.arbol) {
    if (!nodo) {
      return null;
    }
    if (nodo.tipo === 'hoja') {
      return nodo;
    }
    return this.primeraHoja(nodo.primera) || this.primeraHoja(nodo.segunda);
  }

  // Alterna entre maximizar el área enfocada y restaurar el layout anterior.
  alternarMaximizada() {
    if (this.maximizada) {
      this.restaurarLayout();
      return;
    }

    if (!this.areaEnfocada || !this.buscarNodo(this.arbol, this.areaEnfocada)) {
      const primera = this.primeraHoja();
      this.areaEnfocada = primera ? primera.id : null;
      if (!this.areaEnfocada) {
        return;
      }
    }

    this.maximizarArea();
  }

  // Expande el área enfocada para que ocupe todo el escenario.
  maximizarArea() {
    const hoja = this.buscarNodo(this.arbol, this.areaEnfocada);
    if (!hoja || hoja.tipo !== 'hoja') {
      return;
    }

    this.arbolPrevio = this.obtenerArbol();
    this.areaMaximizadaId = hoja.id;

    const hojaAmpliada = crearHoja(hoja.editor);
    this.arbol = hojaAmpliada;
    this.areaEnfocada = hojaAmpliada.id;
    this.maximizada = true;

    this.renderizar();
  }

  // Devuelve el layout al estado anterior a la maximización.
  restaurarLayout() {
    if (!this.maximizada || !this.arbolPrevio) {
      return;
    }

    this.arbol = JSON.parse(JSON.stringify(this.arbolPrevio));
    this.areaEnfocada = this.areaMaximizadaId;
    this.arbolPrevio = null;
    this.areaMaximizadaId = null;
    this.maximizada = false;

    this.renderizar();
  }

  // Atajos de teclado globales del gestor.
  configurarAtajos() {
    document.addEventListener('keydown', (evento) => {
      const objetivo = evento.target;
      const esCampo =
        objetivo &&
        (objetivo.tagName === 'INPUT' ||
          objetivo.tagName === 'TEXTAREA' ||
          objetivo.tagName === 'SELECT');
      const conControl = evento.ctrlKey || evento.metaKey;

      // Los campos de texto conservan sus atajos nativos (deshacer de texto, etc.).
      if (esCampo) {
        return;
      }

      // Ctrl+Espacio: ampliar/restaurar el área enfocada.
      if (conControl && evento.code === 'Space') {
        evento.preventDefault();
        this.alternarMaximizada();
        return;
      }

      // Ctrl+Z: deshacer.
      if (conControl && !evento.shiftKey && evento.code === 'KeyZ') {
        evento.preventDefault();
        this.deshacer();
        return;
      }

      // Ctrl+Shift+Z: rehacer.
      if (conControl && evento.shiftKey && evento.code === 'KeyZ') {
        evento.preventDefault();
        this.rehacer();
      }
    });
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

    // Resalta el área si es la que tiene el foco (área activa de Blender).
    if (nodo.id === this.areaEnfocada) {
      area.classList.add('enfocada');
    }

    // Un clic en cualquier parte del área la convierte en área activa.
    area.addEventListener('click', () => {
      this.enfocarArea(nodo.id);
    });

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
            accion: () => this.dividirArea(nodo.id, FILA, 0.5, false),
          },
          {
            texto: 'Dividir · nueva área abajo',
            accion: () => this.dividirArea(nodo.id, COLUMNA, 0.5, false),
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
      this.registrarCambio();
    };

    divisor.addEventListener('pointermove', alMover);
    divisor.addEventListener('pointerup', alSoltar);
    divisor.addEventListener('pointercancel', alSoltar);
  }

  // Gestiona el arrastre de una esquina con dos comportamientos, igual que Blender:
  //   - Arrastrar hacia el interior del área: divide el área en dos, mostrando
  //     una vista previa en tiempo real. La orientación sigue al eje dominante:
  //     arrastre horizontal => división vertical (lado a lado); arrastre
  //     vertical => división horizontal (arriba/abajo).
  //   - Arrastrar hacia fuera sobre un área adyacente: fusiona ambas áreas,
  //     conservando el área de origen.
  iniciarArrastreEsquina(evento, idArea, esquina) {
    evento.preventDefault();
    const esquinaEl = evento.currentTarget;
    esquinaEl.setPointerCapture(evento.pointerId);

    const areaEl = esquinaEl.closest('.area');
    const rect = areaEl.getBoundingClientRect();

    let accionPendiente = null; // 'dividir' | 'fusionar' | null
    let fusionPendiente = null; // { idAreaObjetivo }

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
        this.ocultarPreviaDivision();
        if (fusion) {
          accionPendiente = 'fusionar';
          fusionPendiente = fusion;
          this.marcarPreviaFusion(fusion.idAreaObjetivo);
        } else {
          accionPendiente = null;
          fusionPendiente = null;
        }
        return;
      }

      // Dentro del área de origen: división en tiempo real.
      const distanciaX = movimiento.clientX - evento.clientX;
      const distanciaY = movimiento.clientY - evento.clientY;
      this.limpiarPrevias();

      if (Math.hypot(distanciaX, distanciaY) > UMBRAL_DIVISION) {
        accionPendiente = 'dividir';
        const horizontal = Math.abs(distanciaX) > Math.abs(distanciaY);
        const ratio = this.calcularRatioDivision(horizontal, rect, movimiento);
        this.mostrarPreviaDivision(idArea, horizontal ? FILA : COLUMNA, ratio);
      } else {
        accionPendiente = null;
        this.ocultarPreviaDivision();
      }
    };

    const finalizar = (aplicar, movimiento) => {
      this.limpiarPrevias();
      this.ocultarPreviaDivision();
      esquinaEl.removeEventListener('pointermove', alMover);
      esquinaEl.removeEventListener('pointerup', alSoltar);
      esquinaEl.removeEventListener('pointercancel', alCancelar);

      if (!aplicar) {
        return;
      }
      if (accionPendiente === 'fusionar' && fusionPendiente) {
        this.fusionarAreas(idArea, fusionPendiente.idAreaObjetivo);
      } else if (accionPendiente === 'dividir') {
        const distanciaX = movimiento.clientX - evento.clientX;
        const distanciaY = movimiento.clientY - evento.clientY;
        const horizontal = Math.abs(distanciaX) > Math.abs(distanciaY);
        const ratio = this.calcularRatioDivision(horizontal, rect, movimiento);
        const nuevaEnPrimera = horizontal
          ? esquina === 'tl' || esquina === 'bl'
          : esquina === 'tl' || esquina === 'tr';
        this.dividirArea(
          idArea,
          horizontal ? FILA : COLUMNA,
          ratio,
          nuevaEnPrimera
        );
      }
    };

    const alSoltar = (movimiento) => finalizar(true, movimiento);
    const alCancelar = () => finalizar(false);

    esquinaEl.addEventListener('pointermove', alMover);
    esquinaEl.addEventListener('pointerup', alSoltar);
    esquinaEl.addEventListener('pointercancel', alCancelar);
  }

  // Calcula el ratio (0..1) de la división según la posición del puntero,
  // tomando como eje dominante el indicado por `horizontal`.
  calcularRatioDivision(horizontal, rect, movimiento) {
    let ratio;
    if (horizontal) {
      ratio = (movimiento.clientX - rect.left) / rect.width;
    } else {
      ratio = (movimiento.clientY - rect.top) / rect.height;
    }
    return Math.min(0.9, Math.max(0.1, ratio));
  }

  // Determina si, arrastrando la esquina fuera de su área, es posible fusionarla
  // con un área adyacente, aunque no sean hermanas en el árbol. Devuelve
  // { idAreaObjetivo } o null si no hay fusión posible.
  resolverFusion(idArea, posicion) {
    const areas = [...this.contenedor.querySelectorAll('.area')];
    const rectOrigen = this.rectDeArea(idArea);
    if (!rectOrigen) {
      return null;
    }

    const MARGEN = 14;
    const candidatos = areas
      .filter((el) => el.dataset.areaId !== idArea)
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(
        ({ r }) =>
          posicion.clientX >= r.left - MARGEN &&
          posicion.clientX <= r.right + MARGEN &&
          posicion.clientY >= r.top - MARGEN &&
          posicion.clientY <= r.bottom + MARGEN
      )
      .sort((a, b) => {
        const da = Math.hypot(
          posicion.clientX - (a.r.left + a.r.width / 2),
          posicion.clientY - (a.r.top + a.r.height / 2)
        );
        const db = Math.hypot(
          posicion.clientX - (b.r.left + b.r.width / 2),
          posicion.clientY - (b.r.top + b.r.height / 2)
        );
        return da - db;
      });

    for (const { el } of candidatos) {
      const rectObjetivo = this.rectDeArea(el.dataset.areaId);
      if (rectObjetivo && this.sonAdyacentes(rectOrigen, rectObjetivo)) {
        return { idAreaObjetivo: el.dataset.areaId };
      }
    }
    return null;
  }

  // Resalta el área que será absorbida durante una fusión.
  marcarPreviaFusion(idAreaObjetivo) {
    const elemento = this.contenedor.querySelector(
      `[data-area-id="${idAreaObjetivo}"]`
    );
    if (elemento) {
      elemento.classList.add('fusion-previa');
    }
  }

  // --------------------------------------------------------------------------
  // Fusión geométrica de áreas (funciona aunque no sean hermanas en el árbol)
  // --------------------------------------------------------------------------

  // Convierte el árbol en una lista de rectángulos normalizados (x, y, w, h).
  aplanar(nodo = this.arbol, caja = { x: 0, y: 0, w: 1, h: 1 }, salida = []) {
    if (!nodo) {
      return salida;
    }
    if (nodo.tipo === 'hoja') {
      salida.push({
        id: nodo.id,
        editor: nodo.editor,
        x: caja.x,
        y: caja.y,
        w: caja.w,
        h: caja.h,
      });
    } else if (nodo.direccion === FILA) {
      const w1 = caja.w * nodo.ratio;
      this.aplanar(
        nodo.primera,
        { x: caja.x, y: caja.y, w: w1, h: caja.h },
        salida
      );
      this.aplanar(
        nodo.segunda,
        { x: caja.x + w1, y: caja.y, w: caja.w - w1, h: caja.h },
        salida
      );
    } else {
      const h1 = caja.h * nodo.ratio;
      this.aplanar(
        nodo.primera,
        { x: caja.x, y: caja.y, w: caja.w, h: h1 },
        salida
      );
      this.aplanar(
        nodo.segunda,
        { x: caja.x, y: caja.y + h1, w: caja.w, h: caja.h - h1 },
        salida
      );
    }
    return salida;
  }

  // Rectángulo normalizado de un área concreta.
  rectDeArea(idArea) {
    return this.aplanar().find((r) => r.id === idArea) || null;
  }

  // Indica si dos rectángulos normalizados comparten un borde (son adyacentes).
  sonAdyacentes(a, b) {
    const EPS = 1e-6;
    const compartenBordeVertical =
      Math.abs(a.x + a.w - b.x) < EPS || Math.abs(b.x + b.w - a.x) < EPS;
    const compartenBordeHorizontal =
      Math.abs(a.y + a.h - b.y) < EPS || Math.abs(b.y + b.h - a.y) < EPS;

    const solapeX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const solapeY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);

    if (compartenBordeVertical && solapeY > EPS) {
      return true;
    }
    if (compartenBordeHorizontal && solapeX > EPS) {
      return true;
    }
    return false;
  }

  // Fusiona el área objetivo dentro del área de origen (esta se expande).
  fusionarAreas(idOrigen, idObjetivo) {
    const rects = this.aplanar();
    const origen = rects.find((r) => r.id === idOrigen);
    const objetivo = rects.find((r) => r.id === idObjetivo);
    if (!origen || !objetivo) {
      return;
    }

    const union = {
      editor: origen.editor,
      x: Math.min(origen.x, objetivo.x),
      y: Math.min(origen.y, objetivo.y),
      w:
        Math.max(origen.x + origen.w, objetivo.x + objetivo.w) -
        Math.min(origen.x, objetivo.x),
      h:
        Math.max(origen.y + origen.h, objetivo.y + objetivo.h) -
        Math.min(origen.y, objetivo.y),
    };

    const restantes = rects.filter(
      (r) => r.id !== idOrigen && r.id !== idObjetivo
    );
    restantes.push(union);

    this.arbol = this.reconstruirArbolDesdeRects(restantes);
    this.areaEnfocada = null;
    this.renderizar();
    this.guardar();
    this.registrarCambio();
  }

  // Reconstruye un árbol binario de divisiones a partir de una partición
  // guillotina de rectángulos normalizados.
  reconstruirArbolDesdeRects(rects, caja = { x: 0, y: 0, w: 1, h: 1 }) {
    const EPS = 1e-6;
    if (rects.length === 1) {
      return crearHoja(rects[0].editor);
    }

    // Corte vertical (separación izquierda/derecha).
    const xs = [...new Set(rects.map((r) => r.x))].sort((a, b) => a - b);
    for (const x of xs) {
      if (x <= caja.x + EPS || x >= caja.x + caja.w - EPS) {
        continue;
      }
      const izq = rects.filter((r) => r.x + r.w <= x + EPS);
      const der = rects.filter((r) => r.x >= x - EPS);
      if (
        izq.length &&
        der.length &&
        izq.length + der.length === rects.length
      ) {
        return crearDivision(
          FILA,
          this.reconstruirArbolDesdeRects(izq, {
            x: caja.x,
            y: caja.y,
            w: x - caja.x,
            h: caja.h,
          }),
          this.reconstruirArbolDesdeRects(der, {
            x,
            y: caja.y,
            w: caja.x + caja.w - x,
            h: caja.h,
          }),
          (x - caja.x) / caja.w
        );
      }
    }

    // Corte horizontal (separación arriba/abajo).
    const ys = [...new Set(rects.map((r) => r.y))].sort((a, b) => a - b);
    for (const y of ys) {
      if (y <= caja.y + EPS || y >= caja.y + caja.h - EPS) {
        continue;
      }
      const arriba = rects.filter((r) => r.y + r.h <= y + EPS);
      const abajo = rects.filter((r) => r.y >= y - EPS);
      if (
        arriba.length &&
        abajo.length &&
        arriba.length + abajo.length === rects.length
      ) {
        return crearDivision(
          COLUMNA,
          this.reconstruirArbolDesdeRects(arriba, {
            x: caja.x,
            y: caja.y,
            w: caja.w,
            h: y - caja.y,
          }),
          this.reconstruirArbolDesdeRects(abajo, {
            x: caja.x,
            y,
            w: caja.w,
            h: caja.y + caja.h - y,
          }),
          (y - caja.y) / caja.h
        );
      }
    }

    // Respaldo (no debería ocurrir con particiones guillotina): apilar.
    const orden = [...rects].sort((a, b) => a.y - b.y || a.x - b.x);
    const mitad = Math.floor(orden.length / 2);
    const primera = orden.slice(0, mitad);
    const segunda = orden.slice(mitad);
    return crearDivision(
      COLUMNA,
      this.reconstruirArbolDesdeRects(primera, {
        x: caja.x,
        y: caja.y,
        w: caja.w,
        h: 0.5,
      }),
      this.reconstruirArbolDesdeRects(segunda, {
        x: caja.x,
        y: caja.y + 0.5,
        w: caja.w,
        h: 0.5,
      }),
      0.5
    );
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

  // Muestra una línea de vista previa de la división sobre el área arrastrada.
  mostrarPreviaDivision(idArea, direccion, ratio) {
    const area = this.contenedor.querySelector(`[data-area-id="${idArea}"]`);
    if (!area) {
      return;
    }

    if (!this.previewDivision) {
      this.previewDivision = document.createElement('div');
      this.previewDivision.className = 'division-previa-linea';
    }

    if (this.previewDivision.parentElement !== area) {
      area.appendChild(this.previewDivision);
    }

    if (direccion === FILA) {
      this.previewDivision.style.left = `${ratio * 100}%`;
      this.previewDivision.style.top = '0';
      this.previewDivision.style.width = '2px';
      this.previewDivision.style.height = '100%';
    } else {
      this.previewDivision.style.top = `${ratio * 100}%`;
      this.previewDivision.style.left = '0';
      this.previewDivision.style.width = '100%';
      this.previewDivision.style.height = '2px';
    }
  }

  // Oculta la línea de vista previa de división.
  ocultarPreviaDivision() {
    if (this.previewDivision) {
      this.previewDivision.remove();
    }
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
