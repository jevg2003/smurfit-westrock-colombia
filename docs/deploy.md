# Despliegue

La app es un proyecto Next.js 16 (Node 24, pnpm). No necesita base de datos: todo lo que guarda el usuario vive en su navegador. El servidor solo hace de proxy cerrado para noticias, regulación y energía, y guarda la clave del asistente de IA.

Hay dos caminos: Vercel (ahora) y un contenedor para producción de la empresa. El mismo código sirve para los dos.

## Variables de entorno

Todas se leen solo en el servidor. Ninguna lleva el prefijo `NEXT_PUBLIC_`. Se copian de `.env.example`.

| Variable | Para qué sirve | Obligatoria | Valor por defecto |
|---|---|---|---|
| `AI_PROVIDER` | Proveedor del asistente: `openai` u `openrouter` | No | `openai` |
| `AI_MODEL` | Modelo a usar; vacío usa el modelo por defecto del proveedor | No | `gpt-4.1-mini` (openai) |
| `OPENAI_API_KEY` | Clave si `AI_PROVIDER=openai`. Habilita también "Buscar en internet" | Para usar el asistente | vacía |
| `OPENROUTER_API_KEY` | Clave si `AI_PROVIDER=openrouter` (sin búsqueda en internet) | Para usar el asistente | vacía |
| `FEATURE_NEWS_RSS` | Titulares de medios colombianos | No | activa |
| `FEATURE_GOOGLE_NEWS` | Búsqueda de Google News (términos: uso personal, riesgo aceptado) | No | activa |
| `FEATURE_MINAMBIENTE` | Publicaciones de Minambiente | No | activa |
| `FEATURE_PRESIDENCIA` | Decretos de Presidencia | No | activa |
| `FEATURE_XM` | Precio de energía de XM | No | activa |

Un interruptor `FEATURE_*` está activo salvo que valga `false`, `0`, `off` o `no`. Sin clave de IA la app funciona completa y el asistente avisa que no está configurado.

## Vercel

1. Importa el repositorio en Vercel (New Project). Vercel detecta Next.js y pnpm por `package.json` y `pnpm-lock.yaml`; `vercel.json` ya fija el framework.
2. En Settings, Environment Variables, agrega las variables de la tabla para Production (y Preview si quieres probar). Nunca pongas claves en el repositorio.
3. Región de las funciones: elige la más cercana a los usuarios (por ejemplo `gru1` São Paulo o `iad1` Virginia). Se cambia en Settings, Functions.
4. Duración de la función: `/api/chat` hace streaming y declara `maxDuration = 60` en su ruta. Verifica que tu plan de Vercel permita 60 segundos.
5. Haz el deploy desde la rama principal. Cada push a `main` despliega solo (`vercel.json`).

La variable `NEXT_OUTPUT` no se define en Vercel: la salida `standalone` es solo para el contenedor.

## Contenedor para producción de la empresa

El `Dockerfile` usa varias etapas con Node 24, genera la salida `standalone` de Next.js y corre con un usuario sin privilegios (`node`).

```bash
docker build -t monitor-entorno .
docker run -d --name monitor-entorno -p 3000:3000 --env-file .env.production monitor-entorno
```

- `.env.production` lo crea la empresa con las variables de la tabla. No se copia a la imagen (`.dockerignore` lo excluye).
- El contenedor escucha en el puerto 3000; usa `PORT` para cambiarlo.
- Pon delante un proxy inverso con HTTPS (la app ya envía HSTS). Si el proxy hace buffering, desactívalo para `/api/chat`, porque la respuesta va en streaming.
- El contenedor necesita salida a internet hacia: `www.datos.gov.co`, `api.worldbank.org`, `servapibi.xm.com.co`, `news.google.com`, los feeds de los medios, `www.minambiente.gov.co`, `dapre.presidencia.gov.co` y el proveedor de IA.

## Cabeceras de seguridad

`next.config.ts` envía una política CSP estática en modo solo reporte (`Content-Security-Policy-Report-Only`), además de `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` y HSTS. No se usa nonce porque obligaría a renderizar todo de forma dinámica.

Para pasar a una CSP que bloquea, cambia el nombre de la cabecera a `Content-Security-Policy` cuando la revisión de abajo no muestre violaciones.

## Lista de revisión después del despliegue

- [ ] `/fuentes`: todas las fuentes en verde (o desactivadas a propósito). El asistente aparece como configurado.
- [ ] Revisión de CSP: abre `/`, `/macro`, `/noticias`, `/asistente` y `/fuentes` con la consola abierta y confirma que no hay avisos de "Content Security Policy". Si no hay, la CSP está lista para pasar a modo que bloquea.
- [ ] El aviso "Smart Work Core: herramienta independiente, sin aval de las entidades que publican los datos." se ve al pie de cada pantalla.
- [ ] `curl -I https://tu-dominio/` muestra las cabeceras de seguridad.
- [ ] El asistente responde y cita fuentes; con "Buscar en internet" activo, también cita la web.
- [ ] Ninguna clave aparece en el código del navegador (busca `sk-` en las pestañas Network y Sources).
- [ ] `/acerca` describe el prototipo, las licencias y la privacidad.
