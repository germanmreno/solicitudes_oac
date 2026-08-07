# Recursos de marca CVM

Suelta aquí los archivos con los nombres exactos indicados. El sistema los consume automáticamente.

## Logos institucionales

| Archivo | Descripción | Posición en el header |
|---|---|---|
| `logo_ministerio.png` | Ministerio del Poder Popular de Desarrollo Minero Ecológico e Industrias Básicas (ente padre) | Izquierda |
| `logo_cvm.png` | Corporación Venezolana de Minería (ente) | Derecha |

> Mientras alguno no exista, se muestra un placeholder con las iniciales en fondo `secondary`.

## Iconos PWA (opcionales)

Copiar a `frontend/public/icons/`:

| Archivo | Tamaño | Uso |
|---|---|---|
| `pwa-192x192.png` | 192×192 | Manifest, Android home screen |
| `pwa-512x512.png` | 512×512 | Manifest, splash screens |
| `pwa-maskable-512x512.png` | 512×512 con safe zone | Iconos adaptivos Android |
| `apple-touch-icon.png` | 180×180 | iOS home screen |

## Favicon

`frontend/public/favicon.svg` ya contiene un placeholder CVM. Para reemplazarlo con el logo real, sobreescribe ese archivo con la versión en SVG o añade `favicon.ico` en la misma carpeta.

## Notas

- Usa PNG con transparencia.
- Si los archivos pesan más de 100 KB, comprímelos antes (`pngquant` o similar).
- **No commitear** versiones intermedias; solo el asset final aprobado.
