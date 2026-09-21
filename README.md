# Nuestro Lugar

> Un pequeño lugar que solo pertenece a nosotros.

Webapp privada para dos personas: el archivo de una relación. Fotografías, recuerdos, pequeñas notas y cartitas, organizados por fecha. Es mobile-first, se instala como app (PWA) y es privada por diseño.

- **Inicio**: el día de hoy, el recuerdo más reciente, uno antiguo que vuelve a aparecer y la actividad reciente.
- **Calendario**: el mes como un mapa de la relación, con miniaturas en los días con fotos.
- **Fotos y videos**: rejilla a pantalla completa y visor con gestos (deslizar, pellizcar para ampliar, deslizar hacia abajo para cerrar). Videos cortos de hasta 50 MB (≈ 30 s).
- **Historia**: la línea de tiempo, que crece sola.
- **Momentos**: los recuerdos marcados con ♡.
- **Cartitas**: cartas privadas entre los dos (no es un chat).
- **Respuestas y «me encanta»**: el ♡ de cada recuerdo se ve para la otra persona («A Favi le encanta») y debajo hay una conversación privada.
- **Notificaciones push**: avisos en el móvil aunque la app esté cerrada (en iPhone, con la app instalada en la pantalla de inicio). Nunca incluyen el texto de notitas, cartas ni respuestas.
- **Notitas**: mensajitos cortos que flotan en Inicio para tu pareja. Se ven una sola vez: al cerrarlos se borran (del servidor también) y solo queda el aviso «Favi vio tu notita».
- **Exportar**: un ZIP con todo, por año/mes/día, con un `recuerdo.json` por recuerdo.

El **recuerdo** (`memories`) es la entidad central. Fotos, favoritos y cartas cuelgan de él, y todas las vistas derivan de una sola consulta, así que nunca pueden contradecirse.

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4 |
| Estado del servidor | TanStack Query (persistido en IndexedDB para abrir al instante y funcionar sin conexión) |
| Animación | Motion (respeta `prefers-reduced-motion`) |
| Backend | Supabase: Auth, PostgreSQL + RLS, Storage privado, Realtime |
| PWA | vite-plugin-pwa (service worker con Workbox) |
| Deploy | GitHub Pages (hash routing) |

No hay backend propio, ni analítica, ni rastreadores, ni fuentes externas.

## Estructura

```
src/
  components/    ui/ (primitivos), memory/, photos/, calendar/, letters/, couple/
  layouts/       AppShell (tab bar / riel), AuthLayout
  pages/         una pantalla por archivo
  providers/     Auth, Couple, Composer, Viewer, Toast
  hooks/         datos (useArchive), realtime, guardado, tema…
  services/      acceso a datos por dominio + storage/ (abstracción de almacenamiento)
  lib/           cliente Supabase, fechas, errores humanos, query client
  types/         filas de BD y tipos de dominio
  utils/         imágenes, descargas, textos
  sw.ts          service worker
supabase/
  migrations/    esquema, seguridad, storage + realtime
  config.toml    configuración para la CLI (desarrollo local)
scripts/
  verify-rls.mjs comprueba el modelo de seguridad de extremo a extremo
```

---

## 1. Crear el proyecto Supabase

1. Entra en <https://supabase.com> → **New project**. Elige una región cercana y guarda la contraseña de la base de datos.
2. **Authentication → Sign In / Providers → Email**: déjalo activado.
   - *Confirm email*: para dos personas, lo más cómodo es **desactivarlo**. Si lo dejas activo, el enlace del correo debe abrirse **en el mismo navegador** donde se creó la cuenta (flujo PKCE).
3. **Authentication → URL Configuration**:
   - *Site URL*: `https://<usuario>.github.io/<repo>/`
   - *Redirect URLs*: añade la misma URL y `http://localhost:5173` para desarrollo.

## 2. Ejecutar el SQL

Tienes dos opciones:

**A · SQL Editor (sin instalar nada).** Abre **SQL Editor** y ejecuta, en este orden, el contenido de:

1. `supabase/migrations/20260921000001_schema.sql`: tablas, restricciones y triggers
2. `supabase/migrations/20260921000002_security.sql`: RLS, funciones de pareja y actividad
3. `supabase/migrations/20260921000003_storage_realtime.sql`: bucket privado, políticas de Storage y Realtime
4. `supabase/migrations/20260922000001_notes.sql`: notitas (se leen una vez)
5. `supabase/migrations/20260922000002_videos_limits.sql`: videos, un solo espacio por instalación y medidor de almacenamiento
6. `supabase/migrations/20260922000003_replies_push.sql`: respuestas y notificaciones push

**B · Supabase CLI.**

```bash
npx supabase login
npx supabase link --project-ref <tu-project-ref>
npx supabase db push
```

## 3. El bucket

La tercera migración **crea el bucket automáticamente**: `memories`, **privado**, con un límite de 30 MB por archivo y solo formatos de imagen. No hace falta crearlo a mano. Si prefieres hacerlo desde el panel: *Storage → New bucket → `memories`*, con *Public bucket* **desactivado**. Después ejecuta igualmente la migración 3 para las políticas.

Las rutas codifican la propiedad y las políticas las validan:

```
couples/<couple_id>/<memory_id>/<photo_id>.jpg        versión principal
couples/<couple_id>/<memory_id>/<photo_id>_thumb.jpg  miniatura
avatars/<user_id>/<timestamp>.jpg                     foto de perfil
```

## 4. Variables de entorno

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon / publishable key>
```

Ambas están en **Project Settings → API**. Usa **solo** la clave pública (`anon` o `sb_publishable_…`).

> ⚠️ **Nunca** pongas la `service_role` / secret key en el frontend, en `.env` ni en GitHub. La app no la necesita: toda la seguridad vive en RLS.

## 5. Desarrollo local

```bash
npm install
npm run dev          # http://localhost:5173
```

Con Supabase local (requiere Docker):

```bash
npx supabase start   # aplica las migraciones automáticamente
# copia la "API URL" y la "anon key" que imprime en .env
npm run dev
```

Otros comandos:

```bash
npm run typecheck    # TypeScript
npm run build        # build de producción en dist/
npm run preview      # sirve dist/ (el service worker solo funciona aquí o en producción)
npm run verify:rls   # comprueba la seguridad (ver abajo)
```

## 6. Primer uso

1. Mauricio crea su cuenta → **Crear nuestro espacio** → elige la fecha de inicio (11/09/2026 por defecto) → recibe un código `XXXX-XXXX`.
2. Faviana crea su cuenta → **Tengo un código** → lo escribe → «Ya estamos los dos.»
3. Cuando ambos estén dentro, desactiva nuevos registros: **Authentication → Sign In / Providers → Allow new users to sign up: off**. Así nadie más puede ni siquiera crear una cuenta.

## 7. Deploy en GitHub Pages

El repositorio incluye `.github/workflows/deploy.yml`.

1. Sube el repositorio a GitHub (el `.gitignore` ya excluye `.env`, `dist/` y exportaciones).
2. **Settings → Pages → Source: GitHub Actions**.
3. **Settings → Secrets and variables → Actions → Secrets**: añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Haz push a `main`. La app queda en `https://<usuario>.github.io/<repo>/`.

**Routing.** La app usa *hash routing* (`/#/calendario`), así que GitHub Pages siempre sirve `index.html` y los enlaces profundos y las recargas funcionan sin 404. El `base` de Vite se toma de `BASE_PATH`, que el workflow calcula a partir del nombre del repositorio.

**Dominio propio (futuro).** Añade el dominio en *Settings → Pages*, crea la variable de repositorio `BASE_PATH` con el valor `/` y actualiza *Site URL* y *Redirect URLs* en Supabase.

## 8. Instalar como app

- **iPhone**: Safari → Compartir → *Añadir a pantalla de inicio*.
- **Android**: Chrome → menú → *Instalar app*.

Se abre a pantalla completa, con su icono, y funciona sin conexión con lo que ya se vio.

---

## Seguridad

La privacidad no depende de ocultar botones. Está en la base de datos:

- **RLS en todas las tablas.** Cada fila pertenece a un `couple_id` y solo sus miembros pueden leerla (`is_couple_member`). Los visitantes anónimos no tienen ningún acceso.
- **FKs compuestas** `(memory_id, couple_id)`: es imposible enlazar una foto, un favorito o una carta de una pareja a un recuerdo de otra.
- **Un solo espacio por instalación.** Aunque los registros sigan abiertos, una cuenta ajena no puede crear otro espacio ni subir archivos, así que no puede gastar su almacenamiento.
- **Una cuenta, una pareja.** `couple_members.user_id` es único. Crear o unirse solo es posible mediante RPCs `security definer`, que validan el código, bloquean la fila y limitan a 2 miembros. El código se retira cuando la pareja está completa.
- **Autoría inmutable** (triggers). Solo el autor elimina un recuerdo o una foto. Quien recibe una carta solo puede marcarla como leída.
- **La actividad la escriben triggers**, así que no se puede falsificar desde el cliente.
- **Storage privado.** No hay URLs públicas. Las fotos se sirven con **URLs firmadas de 1 hora**, y las políticas validan la ruta (`couples/<id>` exige ser miembro; `avatars/<id>` solo lo escribe su dueño).
- **Realtime** solo entrega eventos que RLS permite, y la app siempre vuelve a leer los datos por consultas protegidas.
- `robots.txt` y `noindex` bloquean la indexación, y `referrer: no-referrer` evita filtrar URLs.

Para comprobarlo de extremo a extremo, contra un proyecto **local o de pruebas** (crea cuentas desechables):

```bash
npx supabase start
VITE_SUPABASE_URL=http://127.0.0.1:55321 VITE_SUPABASE_ANON_KEY=<anon local> npm run verify:rls
```

**En este dispositivo.** La app guarda en caché (IndexedDB / Cache Storage) los datos y fotos ya vistos, para abrir al instante y funcionar sin conexión. Todo se borra al cerrar sesión.

## Fotografías

- La **versión principal** conserva el archivo original si es JPEG/PNG/WebP de hasta 5 MB y 4096 px. Si no, se re-codifica a 3072 px con calidad 0.88, lo que sigue siendo nítido en cualquier pantalla.
- La **miniatura** tiene unos 600 px en su lado corto y alimenta la rejilla, el calendario y la línea de tiempo.
- La subida usa XHR con progreso real y se puede reanudar: si falla, «Reintentar» no repite lo que ya se subió.
- **HEIC**: iOS lo convierte automáticamente a JPEG al elegir fotos. En navegadores que no pueden decodificarlo se muestra un error claro.

### Cambiar el almacenamiento a Cloudflare R2

La app solo habla con la interfaz `PhotoStorage` (`src/services/storage/types.ts`: `upload`, `signUrls`, `download`, `remove`). Para migrar:

1. Crea `src/services/storage/r2Storage.ts` implementando la interfaz. Las URLs firmadas de R2 deben emitirse desde un Worker o una Edge Function que verifique el JWT de Supabase y la pertenencia a la pareja, **nunca** con credenciales en el frontend.
2. Cambia una línea en `src/services/storage/provider.ts`.
3. Copia los objetos conservando las mismas rutas. `memory_photos.storage_path` no cambia.

## Notificaciones push

La base de datos avisa a la Edge Function `push` (con `pg_net`) cada vez que hay actividad nueva; la función envía la notificación cifrada al móvil de la pareja con Web Push (VAPID).

1. Genera claves VAPID: `npx web-push generate-vapid-keys`.
2. Secretos de la función (Project Settings → Edge Functions → Secrets): `PUSH_SECRET` (una cadena aleatoria larga), `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` y `APP_URL` (la URL de la app).
3. Despliega: `npx supabase functions deploy push --no-verify-jwt`.
4. En el SQL Editor, la configuración privada (no se expone por la API):
   ```sql
   insert into private.push_config (id, url, secret)
   values (1, 'https://<project-ref>.supabase.co/functions/v1/push', '<PUSH_SECRET>');
   ```
5. En GitHub añade el secreto `VITE_VAPID_PUBLIC_KEY` (la clave pública).

Luego cada persona las activa en **Configuración → Notificaciones**. En iPhone solo funcionan con la app añadida a la pantalla de inicio (iOS 16.4 o posterior).

## Almacenamiento y límites

**Configuración → Almacenamiento** muestra el espacio usado, y al llegar al 80 % aparece un aviso en Inicio. Con el plan gratis de Supabase:

- **1 GB** de archivos en total y **50 MB por archivo**.
- **5 GB al mes de descarga**. Las fotos ya vistas se guardan en el móvil y no vuelven a descargarse; los videos sí, cada vez que se reproducen.
- Si nadie abre la app durante **7 días**, Supabase pausa el proyecto. Se reactiva desde el panel.

Cuando se acerquen al límite, hay dos caminos:

1. **Supabase Pro** (≈ 25 USD/mes): 100 GB y sin pausas. No hay que tocar código; solo hay que ajustar `VITE_STORAGE_LIMIT_MB` para que el medidor lo refleje.
2. **Cloudflare R2**: 10 GB gratis y después ≈ 0,015 USD por GB al mes, sin cargos de descarga. Ideal si hay muchos videos. Ver «Cambiar el almacenamiento a Cloudflare R2».

## Copias de seguridad

La app **no promete** que un proveedor conserve los recuerdos para siempre. En su lugar: **«Puedes exportar nuestra historia cuando quieras.»**

**Más → Exportar recuerdos** genera:

```
Nuestra-Historia/
  LEEME.txt
  historia.json                    todo en un archivo
  2026/09-Septiembre/11/
    foto-01.jpg
    foto-02.jpg
    recuerdo.json                  fecha, título, texto, lugar, estado, autor, fotos, fechas
  Cartitas/
    2026-09-21 · De Mau para Favi · ab12.txt
```

Los meses llevan número delante para que las carpetas se ordenen cronológicamente. Si hay varios recuerdos en un día, cada uno tiene su subcarpeta. En Chrome/Edge de escritorio el ZIP se escribe directamente a disco (sin límite de memoria). En móviles se genera en memoria, así que para archivos muy grandes conviene exportar desde un ordenador.

Cada recuerdo también se puede descargar por separado (**⋯ → Descargar recuerdo**), igual que cada foto desde el visor.

**Para más adelante.** La exportación está aislada en `src/services/export.ts` y todo es direccionable por fecha, así que un backup automático (por ejemplo, una Edge Function programada que copie el bucket a R2/S3) puede añadirse sin tocar la app.

## Sin conexión

- Aparece un aviso discreto de «Sin conexión». La app sigue mostrando lo último que vio.
- Las **notas y cartitas** creadas sin conexión se guardan en el dispositivo y se sincronizan solas al volver la red (inserciones idempotentes con id generado en el cliente).
- Subir fotos requiere conexión. Si falla, el borrador se conserva y se puede reintentar.

## Licencia

Proyecto privado.
