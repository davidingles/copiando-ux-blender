# Gestión de Fábrica · Áreas estilo Blender

Aplicación web de gestión de fábrica cuya interfaz replica el concepto de **áreas** de
Blender: una única ventana dividida en áreas redimensionables, donde cada área puede
mostrar cualquier módulo del programa.

## Tecnologías

- **Frontend**: HTML + CSS + JavaScript (Vanilla, ES Modules). Sin frameworks.
- **Layout de áreas**: motor propio (`frontend/js/area-engine.js`) con árbol binario de
  divisiones, redimensionado, división y unión de áreas.
- **Persistencia**: `localStorage` (el layout se guarda y se restaura automáticamente).

## Módulos disponibles (maqueta visual)

Pedidos · Clientes · Empleados · Troqueles · Proveedores · Clichés · Artículos

## Cómo levantar el proyecto

No se necesita instalación ni backend. Sirve la carpeta `frontend` con un servidor
estático de Node (nunca Python):

```powershell
cd D:\MisDevs\copiando-ux-blender
npm run dev
```

O directamente:

```powershell
npx --yes serve frontend
```

Después abre la URL indicada (por defecto `http://localhost:3000`) **en Chrome**.

## Cómo usar las áreas (estilo Blender)

- **Cambiar módulo de un área**: usa el desplegable de la cabecera del área.
- **Redimensionar**: arrastra el borde (divisor) entre dos áreas.
- **Dividir un área**: arrastra una de sus cuatro esquinas **hacia dentro** del área
  (el tamaño de la nueva área depende de hasta dónde arrastres).
- **Unir dos áreas**: arrastra una esquina **hacia fuera**, sobre el área adyacente
  (la zona que se va a absorber se resalta en rojo). También puedes hacer clic
  derecho sobre el borde y elegir qué lado mantener.
- **Workspaces**: pestañas superiores con distribuciones predefinidas.
- **Restablecer layout**: botón "↺ Restablecer layout" de la barra superior.

## Estructura del proyecto

```
frontend/
  index.html          Página principal
  manifest.json       Manifiesto PWA
  css/styles.css      Estilos (tema oscuro estilo Blender)
  js/app.js           Punto de entrada (workspaces y barra de estado)
  js/area-engine.js   Motor de áreas (layout, división, unión, redimensionado)
  js/modules.js       Registro de módulos de la aplicación
```
