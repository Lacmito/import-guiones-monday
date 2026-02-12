# Import Guiones → Monday

Herramienta local para subir un PDF de guion y crear en Monday un ítem (episodio) con subítems (personajes + loops).

## Requisitos

- Navegador moderno (Chrome, Firefox, Safari, Edge).
- **En el servidor** (local o desplegado): variables **MONDAY_API_TOKEN** y **MONDAY_BOARD_ID** (ver más abajo). Antes: API Token de Monday: en Monday → Perfil → Developers → API → “Token”.
- **Board ID**: el número del board (está en la URL del board: `.../boards/1234567890`).
- PDF con nombre tipo: `Obra_NNN_(...)_(fecha) [STR].pdf` (ej. `Ramo_114_(DUB)_(LAS)_(02112025) [STR].pdf`).

## Variables de entorno (servidor)

El API Token y el Board ID **no se cargan en la interfaz**: el servidor los toma de las variables de entorno.

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `MONDAY_API_TOKEN` | Sí | Token de Monday (Perfil → Developers → API → Token). |
| `MONDAY_BOARD_ID` | Sí | ID del board (número en la URL: `.../boards/1234567890`). |
| `MONDAY_GROUP_ID` | No | Group ID; si no se define, se usa el primer grupo del board. |
| `MONDAY_SUBITEMS_BOARD_ID` | No | ID del board de subitems si la detección automática falla. |
| `ADMIN_KEY` | No | Clave para ver el log de imports en `/admin/log?key=TU_CLAVE`. Por defecto: `cdr-admin-2026`. |

## Cómo probar en local

1. **Definir las variables** (solo para esta terminal) y **arrancar el servidor** (necesario para que las llamadas a Monday no fallen por CORS):

   ```bash
   cd "Import PDF to Monday"
   export MONDAY_API_TOKEN="tu_token_de_monday"
   export MONDAY_BOARD_ID="18397982132"
   npm start
   ```
   Requiere Node.js 18+. El servidor sirve la app y hace de proxy a la API de Monday.

2. Abrir en el navegador: **http://localhost:3000**.

3. Subir un PDF (por ejemplo `Samples/Ramo_114_(DUB)_(LAS)_(02112025) [STR].pdf`).

4. Revisar la vista previa y pulsar **Importar a Monday**. Opcional: Group ID y Subitems Board ID si hace falta.

## Columnas esperadas en el board

- **Ítem (main):** nombre del ítem = número de episodio. Columnas: **Obra** (título original), **Date** (fecha de importación). Opcionales: Person, Status.
- **Subítems:** nombre del subítem = personaje/actor. Columnas: **Loops** (número), **Obra** (“Obra NNN”, ej. “Ramo 114”).

Las columnas se buscan por **título** (Obra, Date, Loops). Si tu board usa otros nombres, habría que ajustar el código para mapearlos.

## Estructura del PDF

- **Número de episodio:** se toma del nombre del archivo (`Obra_NNN_...`).
- **Título original (Obra):** de la línea “TÍTULO ORIGINAL …” en la primera página.
- **Personajes + Loops:** del bloque “PERSONAJE COL ACTOR LLLAMADO LOOPS” y las líneas siguientes (nombre + timecode + COL/ADC + número de loops).

## Despliegue web (acceso por URL)

**Guía paso a paso (si nunca desplegaste):** ver **[DESPLIEGUE.md](DESPLIEGUE.md)**.

Para que cualquiera con el enlace pueda usar la herramienta sin instalar nada:

### Opción recomendada: Render (gratis)

1. **Subí el proyecto a GitHub** (solo los archivos de la app: `index.html`, `styles.css`, `js/`, `server.js`, `package.json`; no hace falta subir `Samples/` ni `extract_samples.py`).

2. Entrá a **[render.com](https://render.com)** y creá una cuenta (o conectá con GitHub).

3. **New → Web Service**. Conectá el repositorio del proyecto.

4. Configuración:
   - **Name:** por ejemplo `import-guiones-monday`
   - **Runtime:** Node
   - **Build command:** (dejar vacío o `npm install` si agregás dependencias)
   - **Start command:** `npm start`
   - **Plan:** Free

5. **Environment** (Environment Variables en Render): agregá `MONDAY_API_TOKEN` y `MONDAY_BOARD_ID` con tus valores. Opcional: `MONDAY_GROUP_ID`, `MONDAY_SUBITEMS_BOARD_ID`.

6. **Create Web Service**. Render va a construir y desplegar. En unos minutos tendrás una URL como `https://import-guiones-monday.onrender.com`.

7. Abrí esa URL en el navegador. El token y el board están configurados en el servidor; nadie los escribe en la interfaz.

**Nota:** En el plan gratuito de Render, el servicio “duerme” tras unos minutos sin uso; la primera visita después de eso puede tardar ~30 segundos en despertar.

### Otras opciones

- **Railway** ([railway.app](https://railway.app)): conectar repo, desplegar como Web Service, start `npm start`.
- **Fly.io** ([fly.io](https://fly.io)): `fly launch` en la carpeta del proyecto (detecta Node) y luego `fly deploy`.
