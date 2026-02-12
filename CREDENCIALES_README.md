# Guardar usuario y token de GitHub para git push

Así Git usa automáticamente tu usuario y token desde un archivo y no te pide la contraseña cada vez.

---

## Paso 1: Crear el archivo con tus credenciales

1. En la carpeta del proyecto, **copiá** el archivo de ejemplo:
   ```bash
   cd "/Users/lacmito/Import PDF to Monday"
   cp CREDENCIALES_GIT.txt.ejemplo CREDENCIALES_GIT.txt
   ```

2. **Abrí** `CREDENCIALES_GIT.txt` con un editor de texto.

3. **Reemplazá** los valores:
   - `GITHUB_USER=` tu usuario de GitHub (ej. `Lacmito`).
   - `GITHUB_TOKEN=` tu Personal Access Token (el que empieza con `ghp_...`).

4. **Guardá** el archivo.  
   `CREDENCIALES_GIT.txt` no se sube a GitHub (está en `.gitignore`).

---

## Paso 2: Dar permiso de ejecución al script

En la terminal:

```bash
cd "/Users/lacmito/Import PDF to Monday"
chmod +x git-credential-from-file.sh
```

---

## Paso 3: Decirle a Git que use ese archivo

Ejecutá **una sola vez** (usá la ruta real de tu carpeta):

```bash
cd "/Users/lacmito/Import PDF to Monday"
git config credential.helper '!"/Users/lacmito/Import PDF to Monday/git-credential-from-file.sh"'
```

Si movés el proyecto de carpeta, tenés que volver a ejecutar este comando con la nueva ruta.

---

## Paso 4: Probar

```bash
cd "/Users/lacmito/Import PDF to Monday"
git push -u origin main
```

No debería pedirte usuario ni contraseña; los toma de `CREDENCIALES_GIT.txt`.

---

## Resumen

| Archivo | Qué es |
|---------|--------|
| `CREDENCIALES_GIT.txt.ejemplo` | Plantilla (se puede subir al repo). |
| `CREDENCIALES_GIT.txt` | Tus usuario y token (no se sube; lo creás vos a partir del ejemplo). |
| `git-credential-from-file.sh` | Script que lee el archivo y se lo pasa a Git. |

Cuando cambies el token en GitHub, editá `CREDENCIALES_GIT.txt` y actualizá la línea `GITHUB_TOKEN=...`.
