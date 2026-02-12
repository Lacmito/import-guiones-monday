# Cómo desplegar Import Guiones → Monday en la nube (paso a paso)

Esta guía usa **Render** (gratis) para que la app tenga una URL pública. No hace falta tener experiencia previa.

---

## Antes de empezar

Tené a mano:

1. **Token de Monday**  
   En Monday: tu perfil (abajo a la izquierda) → **Developers** → **API** → copiá el **API Token**.

2. **Board ID**  
   Abrí el board en Monday. En la barra del navegador la URL es algo como:  
   `https://...monday.com/boards/18397982132`  
   El número después de `/boards/` es el **Board ID** (ej. `18397982132`).

3. **Cuenta en GitHub**  
   Si no tenés: [github.com](https://github.com) → **Sign up** (es gratis).

4. **Cuenta en Render**  
   La vas a crear en el paso 4; podés usar “Sign up with GitHub”.

---

## Paso 1: Subir el proyecto a GitHub

### 1.1 Abrir la terminal en la carpeta del proyecto

En Mac: abrí **Terminal** (o la terminal de Cursor) y ejecutá:

```bash
cd "/Users/lacmito/Import PDF to Monday"
```

(Reemplazá la ruta si tu carpeta está en otro lugar.)

### 1.2 Inicializar Git (si todavía no lo hiciste)

```bash
git init
```

Si ya tenés un repo (por ejemplo ya corriste `git init` antes), podés saltar al 1.3.

### 1.3 Crear el repositorio en GitHub

1. Entrá a [github.com](https://github.com) e iniciá sesión.
2. Clic en el **+** (arriba a la derecha) → **New repository**.
3. **Repository name:** por ejemplo `import-guiones-monday`.
4. Dejalo **Public**. No marques “Add a README” (ya tenés archivos en tu carpeta).
5. Clic en **Create repository**.

GitHub te va a mostrar una página con instrucciones. **No cierres esa pestaña**; la vas a usar en el siguiente paso.

### 1.4 Conectar tu carpeta con GitHub y subir los archivos

En la terminal (seguís en la carpeta del proyecto), ejecutá **una por una**:

```bash
git add index.html styles.css server.js package.json .gitignore
git add js/
git status
```

Deberías ver listados esos archivos. No hace falta subir `Samples/`, `extract_samples.py` ni `requirements.txt` para que la app funcione en la nube.

Luego:

```bash
git commit -m "App lista para desplegar en Render"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/import-guiones-monday.git
```

**Importante:** reemplazá `TU_USUARIO` por tu nombre de usuario de GitHub y `import-guiones-monday` por el nombre del repo que creaste.

Por último, subir al repo:

```bash
git push -u origin main
```

Te va a pedir usuario y contraseña de GitHub. Si usás **contraseña**, en GitHub tenés que tener activada una **Personal Access Token** y usar esa token como “contraseña”.  
(O podés usar **GitHub Desktop** para hacer el push desde una interfaz gráfica.)

Cuando termine, en la página del repo en GitHub deberías ver los archivos (index.html, styles.css, js/, server.js, package.json, etc.).

---

## Paso 2: Crear cuenta en Render

1. Entrá a **[render.com](https://render.com)**.
2. Clic en **Get Started for Free**.
3. Elegí **Sign up with GitHub** (así Render accede a tus repos sin que tengas que configurar nada más).
4. Autorizá a Render cuando GitHub lo pida.

---

## Paso 3: Crear el “Web Service” (tu app en la nube)

1. En el **Dashboard** de Render, clic en **New +** (arriba a la derecha).
2. Elegí **Web Service**.
3. Si te pide conectar GitHub de nuevo, conectá la cuenta donde está el repo.
4. En la lista de repositorios, buscá **import-guiones-monday** (o el nombre que hayas puesto) y clic en **Connect** al lado.

---

## Paso 4: Configurar el servicio

Render te muestra un formulario. Completalo así:

| Campo | Valor |
|-------|--------|
| **Name** | `import-guiones-monday` (o el nombre que quieras para la URL) |
| **Region** | Dejá el que venga (ej. Oregon) |
| **Branch** | `main` |
| **Runtime** | **Node** |
| **Build Command** | Dejalo **vacío** |
| **Start Command** | `npm start` |
| **Plan** | **Free** |

No hagas clic en **Create Web Service** todavía; primero hay que agregar las variables de entorno.

---

## Paso 5: Agregar el token y el Board ID (variables de entorno)

1. En la misma página, bajá hasta la sección **Environment** (o **Environment Variables**).
2. Clic en **Add Environment Variable**.
3. Agregá estas dos variables (una por una):

   - **Key:** `MONDAY_API_TOKEN`  
     **Value:** pegá tu token de Monday (el que copiaste al principio).

   - **Key:** `MONDAY_BOARD_ID`  
     **Value:** el ID del board (ej. `18397982132`).

4. Opcional: si querés fijar un grupo o el board de subitems:
   - **Key:** `MONDAY_GROUP_ID` → **Value:** el ID del grupo (o dejalo sin agregar).
   - **Key:** `MONDAY_SUBITEMS_BOARD_ID` → **Value:** el ID del board de subitems (o dejalo sin agregar).

---

## Paso 6: Desplegar

1. Clic en **Create Web Service** (abajo del formulario).
2. Render va a:
   - clonar tu repo,
   - instalar dependencias (en este proyecto casi no hay),
   - arrancar con `npm start`.
3. En la pantalla del servicio vas a ver un **log** en vivo. Esperá a que aparezca algo como **Your service is live at …** (o que el estado pase a **Live** en verde).
4. Arriba del log vas a ver la **URL** del servicio, por ejemplo:  
   `https://import-guiones-monday.onrender.com`

Esa es la URL de tu app. Abrila en el navegador: deberías ver la pantalla de “Import Guiones → Monday” y ya no te va a pedir API Token ni Board ID (porque los toma del servidor).

---

## Resumen rápido

1. Subir el proyecto a GitHub (repo + `git add` / `commit` / `push`).
2. Entrar a Render y crear un **Web Service** conectado a ese repo.
3. **Start command:** `npm start`.
4. En **Environment**, agregar `MONDAY_API_TOKEN` y `MONDAY_BOARD_ID`.
5. **Create Web Service** y esperar a que esté **Live**.
6. Usar la URL que te da Render (ej. `https://import-guiones-monday.onrender.com`).

---

## Notas importantes

- **Plan Free:** si nadie entra a la app durante un rato, Render “duerme” el servicio. La primera visita después de eso puede tardar **30–60 segundos** en cargar; es normal.
- **Cambios en el código:** cuando quieras actualizar la app, hacé los cambios en tu carpeta, luego:
  ```bash
  git add .
  git commit -m "Descripción del cambio"
  git push
  ```
  Render suele redesplegar solo al detectar el push; si no, en el Dashboard del servicio usá **Manual Deploy** → **Deploy latest commit**.

Si en algún paso algo no coincide con lo que ves en pantalla, decime en cuál paso estás y qué te muestra y lo ajustamos.
