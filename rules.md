# PWA Project Rules: DAVID

## ROLES & AGENT WORKFLOW

Antes de escribir o modificar código, sigue estrictamente este orden:

1. **Comprensión**: Resume brevemente qué entiendes del prompt.
2. **Planificación**: Muestra los pasos exactos de la implementación.
3. **Consensuar**: Si hay opciones de arquitectura o diseño, detállalas y detén la ejecución hasta recibir confirmación explícita del usuario.

## ANTI-LAZINESS & CODE OUTPUT

- **Código Completo**: Genera siempre el archivo completo modificado. Prohibido usar placeholders como // ... resto del código.
- **Legibilidad**: Prohibido minificar u ofuscar código. Nombres de variables explícitos y descriptivos.
- **Idioma**: Comentarios del código obligatorios y exclusivamente en Español.

## OS & SHELL CONSTRAINTS

- **Entorno**: Windows 10/11 (PowerShell / pwsh).
- **Rutas**: Usa barras invertidas de Windows (\).
- **Comandos**: Usa comandos nativos de pwsh (New-Item, Copy-Item, Remove-Item).
- **Formato**: Fin de línea CRLF, indentación de 2 espacios.

## DIRECTORY STRUCTURE

El proyecto debe mantenerse desacoplado:

proyecto/
├── backend/ → API Node.js + Express (independiente)
├── database/ → PostgreSQL / SQL
└── frontend/ → Web + PWA (Vanilla JS)

- El backend nunca debe depender de archivos del frontend (manifest, sw.js, iconos, etc.).
- El frontend solo consume la API HTTP del backend.
- No mezclar lógica de negocio del backend dentro del frontend.

## ARCHIVOS PROTEGIDOS

Los siguientes archivos solo se crean si no existen. Nunca sobrescribirlos:

- rules.md

## CONVENCIONES DE CÓDIGO

- Backend: CommonJS (require / module.exports)
- Frontend: ES Modules (import / export)
- Nombres de archivos y carpetas en minúsculas y con guiones (kebab-case)
- Variables y funciones en camelCase
- Constantes en UPPER_SNAKE_CASE

## PREFERENCES

-Cuando levantes el servidor o el frontend en el localhost usa siempre Chorme y no el editor
-Mantén actualizado el archivo README.md dando prioridad a indicar como se levanta el proyecto y sus tecnologías
