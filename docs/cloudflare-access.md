# Cloudflare Access en swc.mecateo.co

Esta guía explica cómo se protege la app y qué hay que crear en Cloudflare y Vercel. El código ya está listo; falta la configuración.

## 1. Diseño

### Rutas públicas y privadas

Solo es público el landing `/` y sus archivos estáticos. Todo lo demás, `/api/*` incluido, exige iniciar sesión. Una ruta nueva nace privada.

| Regla | Tipo | Descripción |
| --- | --- | --- |
| `/` | exacta | Landing público. |
| `/_next/static/` | prefijo | Archivos de la build (JS, CSS, fuentes) que usa el landing. |
| `/landing/` | prefijo | Imágenes y medios del landing. |
| `/favicon.svg` | exacta | Ícono del sitio. |

La fuente de verdad es `PUBLIC_PATH_RULES` en `src/lib/access-paths.ts`. Si cambias esa lista, cambia también las reglas Bypass de Cloudflare.

Cualquier ruta rara se trata como privada: `//`, `/landing/../api/chat`, `%2e%2e`, `/landing` sin barra final, mayúsculas (`/Landing/`), puntos al final, barras invertidas. `/_next/image` y `/_next/data/*` también son privadas.

### Por qué la app valida el JWT

Cloudflare Access protege el dominio `swc.mecateo.co`, pero la app también vive en Vercel con una URL directa (`*.vercel.app`). Quien llegue por esa URL se salta Cloudflare. Por eso `src/proxy.ts` revisa en cada petición privada el JWT que Access agrega (cabecera `Cf-Access-Jwt-Assertion`, o la cookie `CF_Authorization`):

- Firma RS256 con las llaves de `https://<equipo>.cloudflareaccess.com/cdn-cgi/access/certs`.
- Emisor `https://<equipo>.cloudflareaccess.com` y audiencia igual al AUD de la aplicación.
- Tolerancia de reloj de 5 segundos.

Así, quien entre por `*.vercel.app` no puede usar la app ni gastar los créditos de IA de `/api/chat`. Respuestas sin sesión válida: `/api/*` devuelve `401 {"error":"unauthorized"}` y las páginas un `401` de texto simple. No hay redirección.

Si la validación pasa, el proxy agrega la cabecera `x-access-email` con el correo verificado. Cualquier `x-access-email` que venga de fuera se borra siempre.

### Falla cerrada e interruptor de emergencia

- Si faltan `CF_ACCESS_TEAM_DOMAIN` o `CF_ACCESS_AUD` en producción, las rutas privadas responden `503` ("Acceso no configurado..."). Es a propósito: una configuración olvidada no debe dejar la app abierta.
- En desarrollo y en pruebas (`NODE_ENV` igual a `development` o `test`) no se exige.
- Interruptor de emergencia: `CF_ACCESS_ENFORCE=off` desactiva la validación. Úsalo solo si Access falla y quítalo en cuanto se arregle. Mientras esté puesto, la pantalla Fuentes muestra "Cloudflare Access: sin configurar".

## 2. Qué crear en Cloudflare

Reemplaza los marcadores `<...>` con los valores reales. No hace falta pegar ningún secreto en el repo.

### a) Aplicación de Access para todo el host

Zero Trust > Access > Applications > Add an application > Self-hosted.

- Nombre: `SWC Radar`.
- Destino: dominio `swc.mecateo.co`, sin ruta (cubre todo el host).
- Duración de la sesión: 24 horas.
- Método de login: solo **One-time PIN**. Quita los demás proveedores de esta aplicación.
- Política `Allow`, acción Allow, regla Include > Emails:
  - `arbelaeznicolas636@gmail.com`
  - `jevgdg@gmail.com`
- Anota el **Application Audience (AUD) Tag**: `<AUD_TAG>`.
- Anota el dominio del equipo: `<equipo>.cloudflareaccess.com` (Settings > Custom pages o Zero Trust > Settings).

### b) Rutas públicas (Bypass)

Crea una aplicación self-hosted por cada ruta pública, con una política de acción **Bypass** y regla Include > Everyone:

| Aplicación | Destino |
| --- | --- |
| `SWC Landing raíz` | `swc.mecateo.co` con ruta vacía o `/`. Ver nota. |
| `SWC Static` | `swc.mecateo.co/_next/static/*` |
| `SWC Landing assets` | `swc.mecateo.co/landing/*` |
| `SWC Favicon` | `swc.mecateo.co/favicon.svg` |

Notas:

- Gana la ruta más específica. La aplicación de todo el host (a) queda como regla general y las de Bypass la superan en sus rutas.
- **Hay que verificar con `curl` que la raíz exacta `/` queda pública** (sección 4). Cloudflare puede tratar una aplicación con ruta `/` como "todo el host".
- Plan B si la raíz exacta no se puede igualar: dejar la aplicación (a) solo con las rutas privadas, es decir un destino por cada ruta privada (`swc.mecateo.co/home*`, `/api/*`, `/noticias*`, etc.), y no crear la de raíz. Cada ruta nueva privada habría que agregarla a mano, así que la app seguiría validando el JWT como segunda barrera. Otro plan B: mover el landing a un subdominio público aparte.

### c) DNS

El registro de `swc` debe estar **proxied** (nube naranja). Si está en "DNS only", el tráfico no pasa por Cloudflare y Access no se aplica (la app respondería 401 a todo lo privado por la validación del JWT).

## 3. Variables en Vercel

Project Settings > Environment Variables (Production, y Preview si quieres probar):

| Variable | Valor |
| --- | --- |
| `CF_ACCESS_TEAM_DOMAIN` | `<equipo>.cloudflareaccess.com` (sin `https://`) |
| `CF_ACCESS_AUD` | `<AUD_TAG>` |

Después de guardarlas hay que hacer un nuevo deploy. Son solo de servidor: nunca con prefijo `NEXT_PUBLIC_`.

## 4. Lista de verificación

Haz estas pruebas en orden, sin cookies de sesión.

```bash
# 1. El landing es público: debe dar 200.
curl -s -o /dev/null -w "%{http_code}\n" https://swc.mecateo.co/

# 2. Archivos públicos: 200.
curl -s -o /dev/null -w "%{http_code}\n" https://swc.mecateo.co/favicon.svg

# 3. Páginas y API privadas: 302 a cloudflareaccess.com.
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://swc.mecateo.co/home
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://swc.mecateo.co/api/news

# 4. Entrada directa a Vercel: 401 en la página y en la API.
curl -s -o /dev/null -w "%{http_code}\n" https://<proyecto>.vercel.app/home
curl -s -X POST -o /dev/null -w "%{http_code}\n" https://<proyecto>.vercel.app/api/chat

# 5. Con la cabecera de AJAX, Access responde 401 en lugar de redirigir (así detecta la app una sesión vencida).
curl -s -o /dev/null -w "%{http_code}\n" -H "X-Requested-With: XMLHttpRequest" https://swc.mecateo.co/api/news
```

Resultado esperado: 200, 200, 302, 302, 401, 401, 401. Si el paso 1 da 302, la raíz exacta no quedó en Bypass (ver el plan B de la sección 2b).

Prueba en el navegador:

1. Abre `https://swc.mecateo.co/`: ves el landing sin login.
2. Entra a `/home`: pide el correo, llega el código y entras (solo con los dos correos permitidos).
3. Sesión vencida: en Zero Trust revoca la sesión del usuario (o borra la cookie `CF_Authorization`) con la app abierta y pulsa Reintentar en cualquier dato o envía un mensaje al asistente. Debe aparecer "Tu sesión de acceso venció. Vuelve a entrar para seguir." con el botón "Volver a entrar", que recarga la página y muestra el login.
4. En la pantalla Fuentes la fila "Cloudflare Access" dice "protegido".

## 5. Previews de Vercel

Los deploys de preview (`*.vercel.app`) también quedan bloqueados en las rutas no públicas, por diseño: no pasan por Cloudflare y no traen el JWT. Para revisar una preview, o pones temporalmente `CF_ACCESS_ENFORCE=off` solo en el entorno Preview, o la pruebas en local.
