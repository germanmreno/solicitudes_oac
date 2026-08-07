# Registro de Solicitudes CVM

Sistema de gestión de solicitudes de atención al ciudadano de la **Corporación Venezolana de Minería (CVM)**. Registra ayudas sociales, condiciones médicas, pagos y documentos asociados, con panel administrativo, línea de tiempo de auditoría, gráficos y soporte offline.

## Stack
- **Backend**: Node 20, Express, TypeScript, Prisma, PostgreSQL 16, JWT, Argon2, Multer, Zod, Pino.
- **Frontend**: Vite, React 18, TypeScript, Tailwind, shadcn/ui, TanStack Query, React Hook Form, Zod, Dexie, vite-plugin-pwa, Apache ECharts.

## Requisitos previos
- Node.js 20+
- PostgreSQL 16+ (instalación **nativa**, no se usa Docker)

### Instalar PostgreSQL 16
- **Linux (Debian/Ubuntu)**:
  ```bash
  sudo apt install postgresql-16
  sudo service postgresql start
  ```
- **macOS**:
  ```bash
  brew install postgresql@16
  brew services start postgresql@16
  ```
- **Windows**: instalador de [EDB](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads) o `winget install PostgreSQL.PostgreSQL.16`.

### Crear base de datos y usuario
```bash
sudo -u postgres psql <<'SQL'
CREATE USER cvm_censo WITH PASSWORD 'cambiar_en_env';
CREATE DATABASE cvm_censo OWNER cvm_censo;
GRANT ALL PRIVILEGES ON DATABASE cvm_censo TO cvm_censo;
SQL
```

## Setup
1. Clonar el repositorio y entrar a la carpeta.
2. `cp .env.example .env` y editar las variables (especialmente `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`).
3. `npm install` (en la raíz; instala backend y frontend).
4. `npm run db:migrate` — corre las migraciones de Prisma.
5. `npm run db:seed` — crea el usuario admin inicial. **Imprime una contraseña temporal en consola; rotar al primer login**.
6. `npm run dev` — backend en `:4700`, frontend en `:4701` (Vite proxifica `/api` → `:4700`).

## Credenciales del seed
- Usuario: `admin`
- Contraseña: la que imprima `npm run db:seed` (solo se muestra una vez).

## Comandos
| Acción | Comando |
|---|---|
| Dev | `npm run dev` |
| Build prod | `npm run build` |
| Migración nueva | `cd backend && npx prisma migrate dev --name <slug>` |
| Tests | `npm test` |
| Lint | `npm run lint` |
| Formato | `npm run format` |
| Reset DB (borra todo) | `npm run db:reset` |

## Estructura
```
censo_cvm/
├── backend/            # API REST
│   ├── prisma/         # schema + migrations + seed
│   ├── uploads/        # archivos subidos (gitignored)
│   └── src/
│       ├── modules/    # auth, users, census, audit
│       ├── middlewares/
│       ├── lib/
│       └── server.ts
├── frontend/           # SPA + PWA
│   ├── public/
│   └── src/
│       ├── features/   # auth, census, users
│       ├── components/
│       └── lib/
└── AGENTS.md           # guía para agentes IA
```

## Roles
- **ADMIN**: ve todas las solicitudes, gestiona usuarios y catálogos (tipos de procedencia, sedes, tipos de ayuda, áreas, tipos de documento y sus requisitos), puede sobrescribir el N° de expediente.
- **OPERATOR**: crea y edita solicitudes; ve los registros que él mismo creó (en MVP, ve todos).

## Soporte offline (PWA)
- El service worker se activa automáticamente.
- Las mutaciones se encolan en IndexedDB (Dexie) con `idempotencyKey` y se sincronizan al detectar conexión.
- Botón "Sincronizar ahora" en el header.

## Despliegue en producción (`/oac/`)
- La SPA se sirve en `https://cvm.com.ve/oac/` (Vite `base: '/oac/'`). Los assets, el router y las llamadas a la API derivan de `BASE_URL`.
- El frontend llama a `/oac/api/v1/…`; el reverse proxy debe reescribir `/oac/api/*` → `:4700/api/*`.
- En producción, `COOKIE_PATH` del backend debe ser `/oac/api/v1/auth` para que el refresh silencioso funcione.
- Build: `npm run build` (frontend en `frontend/dist/`, backend con `NODE_ENV=production`). Ver `AGENTS.md` → "Producción (despliegue bajo subpath /oac/)" para el ejemplo Nginx completo.

### Checklist de despliegue en el servidor (tras el `git clone`)
1. **Instalar dependencias del SO**: Node.js 20+, PostgreSQL 16+ y Nginx (nativo, sin Docker).
2. **Crear base de datos y usuario**:
   ```bash
   sudo -u postgres psql <<'SQL'
   CREATE USER cvm_censo WITH PASSWORD 'cambiar_en_produccion';
   CREATE DATABASE cvm_censo OWNER cvm_censo;
   GRANT ALL PRIVILEGES ON DATABASE cvm_censo TO cvm_censo;
   SQL
   ```
3. **Configurar el entorno**: `cp .env.example .env` (y `cp backend/.env.example backend/.env` si existe) y rellenar:
   - `DATABASE_URL` con el usuario/clave de producción.
   - `JWT_SECRET` y `JWT_REFRESH_SECRET` con valores largos y aleatorios (≥16 chars).
   - `NODE_ENV=production`, `PORT=4700`.
   - `CORS_ORIGIN=https://cvm.com.ve` (same-origin no aplica, pero queda correcto).
   - `COOKIE_PATH=/oac/api/v1/auth` (**obligatorio** para el refresh bajo subpath).
4. **Instalar dependencias y migrar**: `npm install` y `npm run db:migrate` (crea las tablas).
5. **Sembrar datos base**: `npm run db:seed` (crea el admin con contraseña temporal — rotarla al primer login; crea catálogos y tipos de documento).
6. **Construir el frontend**: `npm run build` → subir `frontend/dist/` a `/var/www/oac/`.
7. **Servir el backend**: correr el backend en `:4700` (p. ej. con `pm2` o `systemd`) apuntando a `backend/` con `NODE_ENV=production`.
8. **Configurar Nginx** (ejemplo en `AGENTS.md`): `location /oac/api/ → proxy_pass :4700/api/` y `location /oac/ → alias /var/www/oac/` con `try_files … /oac/index.html`.
9. **Permisos de uploads**: asegurar que el usuario del backend tiene escritura en `backend/uploads/` y respaldarlo periódicamente.
10. **Verificación**: abrir `https://cvm.com.ve/oac/` → login → crear solicitud → adjuntar documentos → consulta pública en `/oac/consulta`.

## Troubleshooting
- **`PrismaClientInitializationError`**: revisar `DATABASE_URL` y que Postgres esté corriendo.
- **`port 4700 already in use` (Windows)**: abrir Administrador de tareas → finalizar `node.exe`, o cambiar `PORT` en `.env`.
- **CORS error al refrescar token**: `CORS_ORIGIN` debe coincidir exactamente con el origen del frontend (puerto incluido).
- **Archivos de censo en staging/prod**: hacer backup periódico de `backend/uploads/`. No versionar.

## Licencia
Privado · Corporación Venezolana de Minería · 2026
