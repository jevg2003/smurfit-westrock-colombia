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
| `/icon.svg` | exacta | Ícono del sitio (SVG). |
| `/favicon.ico` | exacta | Ícono para navegadores que piden el `.ico`. |
| `/apple-touch-icon.png` | exacta | Ícono para la pantalla de inicio de iOS. |

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
- Interruptor de emergencia: `CF_ACCESS_ENFORCE=off` desactiva la validación. Úsalo solo si Access falla y quítalo en cuanto se arregle. Mientras esté puesto, la pestaña Fuentes de Configuración muestra "Cloudflare Access: sin configurar".

## 2. Lo que está creado en Cloudflare

Aplicado y verificado el 2026-10-21 en la cuenta de Cloudflare del proyecto. No se tocaron las aplicaciones `Mecateo Admin` ni `Mecateo Web`.

### a) Aplicación privada: `SWC Monitor (privado)`

- Tipo self-hosted, sesión de 24 horas, redirección automática al proveedor de login.
- Login: **Google** (el mismo proveedor que usan las otras aplicaciones de la cuenta). No se creó un proveedor nuevo.
- Política `swc-emails` (reutilizable, acción Allow): solo `arbelaeznicolas636@gmail.com` y `jevgdg@gmail.com`. No se reutilizó `team-emails` porque deja entrar a otros dos correos.
- Destinos: uno por cada ruta privada. La lista vive en `src/lib/access-destinations.ts` (`PRIVATE_ACCESS_DESTINATIONS`): las seis páginas del grupo `(app)` como prefijo (`swc.mecateo.co/resumen*`, `/economia*`, `/noticias*`, `/analisis*`, `/asistente*` y `/configuracion*`), `swc.mecateo.co/api/*`, `/_next/image*`, `/_next/data/*` y `/.well-known/*`.
- El **AUD** de esta aplicación es el valor de `CF_ACCESS_AUD`. Se ve en Zero Trust > Access > Applications > `SWC Monitor (privado)`, o en el parámetro `kid` de la URL de login.

### b) Aplicación pública: `SWC Landing (pública)`

- Política `swc-public-bypass` (reutilizable, acción Bypass, Include > Everyone).
- Destinos: `swc.mecateo.co/`, `swc.mecateo.co/_next/static/*`, `swc.mecateo.co/landing/*`, `swc.mecateo.co/icon.svg`, `swc.mecateo.co/favicon.ico` y `swc.mecateo.co/apple-touch-icon.png`. Es el mismo contrato que `PUBLIC_PATH_RULES`.

### c) Por qué una lista de rutas y no una regla para todo el host

Se probó primero una aplicación privada para todo el host (`swc.mecateo.co` y también `swc.mecateo.co/*`) más el Bypass de la raíz. **La raíz `/` seguía pidiendo login (302)**: Access no deja que `swc.mecateo.co/` sea más específico que el host completo. Con la lista de rutas privadas, `/` responde 200.

Consecuencias:

- Una ruta nueva que no esté en la lista queda **pública en el borde de Cloudflare**. La app sigue protegida porque `src/proxy.ts` la rechaza con 401 (sin JWT válido de Access) o con 503 si falta la configuración. Pero ya no se ve la pantalla de login, solo el 401.
- Por eso `src/lib/access-destinations.test.ts` falla si aparece una carpeta nueva en `src/app/(app)` que no esté en la lista. Al agregar una ruta: súmala a `PRIVATE_ACCESS_DESTINATIONS` **y** a los destinos de `SWC Monitor (privado)` en Cloudflare.
- Si se agrega una ruta privada fuera de `(app)`, hay que sumarla a mano a las dos cosas. Hoy son `/empresas` (selector de empresa) y `/onboarding` (alta de empresa), que viven en el grupo `(account)`: agréguelas a los destinos de `SWC Monitor (privado)` como `swc.mecateo.co/empresas*` y `swc.mecateo.co/onboarding*`. Mientras no estén, el borde de Cloudflare las deja pasar y la protección la da solo `src/proxy.ts` (401 sin JWT válido).

### d) DNS

El registro CNAME de `swc` está **proxied** (nube naranja). Si estuviera en "DNS only", el tráfico no pasaría por Cloudflare y Access no se aplicaría (la app respondería 401 a todo lo privado por la validación del JWT).

## 3. Variables en Vercel

Project Settings > Environment Variables (Production, y Preview si quieres probar):

| Variable | Valor |
| --- | --- |
| `CF_ACCESS_TEAM_DOMAIN` | `arbelaeznicolas.cloudflareaccess.com` (sin `https://`) |
| `CF_ACCESS_AUD` | el AUD de `SWC Monitor (privado)` (sección 2a) |

Después de guardarlas hay que hacer un nuevo deploy. Son solo de servidor: nunca con prefijo `NEXT_PUBLIC_`.

## 4. Lista de verificación

Haz estas pruebas en orden, sin cookies de sesión.

```bash
# 1. El landing es público: debe dar 200.
curl -s -o /dev/null -w "%{http_code}\n" https://swc.mecateo.co/

# 2. Archivos públicos: 200.
curl -s -o /dev/null -w "%{http_code}\n" https://swc.mecateo.co/icon.svg
curl -s -o /dev/null -w "%{http_code}\n" https://swc.mecateo.co/favicon.ico
curl -s -o /dev/null -w "%{http_code}\n" https://swc.mecateo.co/apple-touch-icon.png

# 3. Páginas y API privadas: 302 a cloudflareaccess.com.
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://swc.mecateo.co/resumen
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://swc.mecateo.co/api/news

# 4. Entrada directa a Vercel: 401 en la página y en la API.
curl -s -o /dev/null -w "%{http_code}\n" https://<proyecto>.vercel.app/resumen
curl -s -X POST -o /dev/null -w "%{http_code}\n" https://<proyecto>.vercel.app/api/chat

# 5. Con la cabecera de AJAX, Access responde 401 en lugar de redirigir (así detecta la app una sesión vencida).
curl -s -o /dev/null -w "%{http_code}\n" -H "X-Requested-With: XMLHttpRequest" https://swc.mecateo.co/api/news
```

Resultado esperado: 200, 200, 302, 302, 401, 401, 401. Si el paso 1 da 302, la raíz no quedó pública (ver la sección 2c).

Prueba en el navegador:

1. Abre `https://swc.mecateo.co/`: ves el landing sin login.
2. Entre a `/resumen`: lo manda a iniciar sesión con Google y entran solo los dos correos permitidos. Haga lo mismo con `/economia`, `/noticias`, `/analisis`, `/asistente`, `/configuracion`, `/empresas` y `/onboarding`.
3. Sesión vencida: en Zero Trust revoca la sesión del usuario (o borra la cookie `CF_Authorization`) con la app abierta y pulsa Reintentar en cualquier dato o envía un mensaje al asistente. Debe aparecer "Su sesión de acceso venció. Vuelva a entrar para seguir." con el botón "Volver a entrar", que recarga la página y muestra el login.
4. En Configuración > Fuentes la fila "Cloudflare Access" dice "protegido".

## 5. Previews de Vercel

Los deploys de preview (`*.vercel.app`) también quedan bloqueados en las rutas no públicas, por diseño: no pasan por Cloudflare y no traen el JWT. Para revisar una preview, o pones temporalmente `CF_ACCESS_ENFORCE=off` solo en el entorno Preview, o la pruebas en local.
