# AGENTS.md

> Registro de Solicitudes de Atención al Ciudadano — sistema de gestión de ayudas de la Corporación Venezolana de Minería (CVM).

## Stack
- **Monorepo**: npm workspaces. Paquetes: `backend`, `frontend`.
- **Backend**: Node 20, Express + TypeScript, Prisma + PostgreSQL 16, JWT, Argon2, Multer, Zod, Pino.
- **Frontend**: Vite + React 18 + TypeScript, Tailwind, shadcn/ui, TanStack Query, React Hook Form, Zod, Dexie (IndexedDB), vite-plugin-pwa, Apache ECharts.
- **Sin Docker.** Postgres se instala y corre de forma nativa.

## Estructura
- `backend/` — API en `src/modules/<feature>/`. Punto de entrada: `src/server.ts` (usa `src/app.ts` para tests).
- `backend/prisma/` — schema, migraciones y `seed.ts`.
- `backend/uploads/` — archivos subidos (gitignored, nunca commitear).
- `backend/src/modules/audit/` — nuevo módulo de auditoría con GET paginado.
- `backend/src/modules/documentTypes/` — nuevo catálogo de tipos de documento y sus relaciones por tipo de ayuda.
- `frontend/src/features/<feature>/` — módulos por dominio (auth, census, users, documentTypes, audit).
- `frontend/src/components/audit/` — `AuditTimeline` (línea de tiempo accesible con filtros y paginación).
- `frontend/src/components/ui/` — primitivos de shadcn. Incluye `DataTable` reutilizable con orden accesible (`aria-sort`).
- `frontend/src/lib/api/client.ts` — Axios con `withCredentials` y refresh en 401.

## Setup (orden obligatorio)
1. Instalar Postgres 16 nativo (ver README por SO) y crear DB + usuario.
2. `cp .env.example .env` en la raíz. Llenar `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`.
3. `npm install` en la raíz (instala ambos workspaces).
4. `npm run db:migrate` — corre Prisma migrate. **Debe ejecutarse desde `backend/`** (el script lo hace).
5. `npm run db:seed` — crea admin, tipos de procedencia, tipos de ayuda, áreas médicas/sociales/económicas/educacionales y tipos de documento. Imprime contraseña temporal en consola; rotar al primer login.
6. `npm run dev` — backend en `:4700`, frontend en `:4701` (Vite proxifica `/api` → `:4700`).

## Comandos clave
| Tarea | Comando (desde la raíz salvo indicación) |
|---|---|
| Dev | `npm run dev` |
| Migración nueva | `cd backend && npx prisma migrate dev --name <slug>` |
| Generar cliente Prisma | `cd backend && npx prisma generate` |
| Seed | `npm run db:seed` |
| Tests backend | `npm test --workspace=backend` |
| Test focalizado | `cd backend && npx vitest run src/modules/census/census.service.test.ts` |
| Tests frontend | `npm test --workspace=frontend` |
| Build prod | `npm run build` |
| Lint | `npm run lint` |
| Formato | `npm run format` |

## Convenciones del proyecto
- **Idioma**: todo el código visible para el usuario en español (`lang="es"`). Mensajes, validaciones, etiquetas, estados.
- **Roles**: `ADMIN` y `OPERATOR`. Endpoints sensibles van con `requireRole('ADMIN')` en `backend/src/middlewares/role.ts`.
- **Errores**: respuesta uniforme `{ error: { code, message, details } }`. Handler global en `middlewares/error.ts`.
- **Schemas Zod**: duplicados en `backend/src/modules/*/<feature>.schema.ts` y `frontend/src/lib/schemas/`. **Si modificas uno, replica en el otro** (no hay paquete compartido todavía).
- **No commitear** sin pedido explícito del usuario. Tampoco modificar configuración de git.
- **No agregar comentarios** en código salvo que el usuario lo pida.
- **Auditoría**: usar `writeAudit` en TODA mutación sensible (cambio de estatus, edición de campos, upload/delete de documentos, cambios de pago, login). Los cambios a múltiples campos se persisten como `payload: { fields: { nombre: { from, to } } }` para reconstruir la línea de tiempo en el front.

## Validaciones críticas (no debilitar)
- **Cédula**: regex `/^[VENE]-\d{6,8}$/i`. Acepta V, E, N (venezolano, extranjero, naturalizado). Mensaje: "Formato inválido. Ejemplos: V-27376369, E-1234567, N-12345678".
- **Uploads**: máx 10 MB, mime `pdf|jpeg|jpg|png|webp`. Nombre en disco = UUID (nunca usar `originalname`). Carpetas: `ids/{yyyy}/{mm}/`, `invoices/{yyyy}/{mm}/`, `medical/{censusId}/`.
- **N° de expediente**: formato `CVM-{YYYY}-{5 dígitos secuenciales}`, autogenerable vía `GET /api/v1/census/next-file-number`. Reinicia por año. Único, sobrescribible por admin.
- **Sexo**: enum `Sex { MASCULINO, FEMENINO }`. Obligatorio en solicitante y beneficiario.
- **Procedencia**: catálogo `OriginType` con flag `requiresSite`. Si `requiresSite` es true, el campo `siteId` es obligatorio. `originDetail` es texto libre opcional (comunidad).
- **Beneficiario**: si `beneficiarySameAsApplicant` es false, los campos `beneficiaryName`, `beneficiaryIdNumber` (regex cédula) y `beneficiarySex` son obligatorios.
- **Tipo de ayuda**: catálogo `AidType`. **Área de ayuda**: catálogo `AidArea` FK a `AidType`. Si el área tiene `requiresDetail` true, `aidAreaOther` es obligatorio. Validación en service de que el área pertenece al tipo seleccionado.
- **Documentos requeridos**: `AidTypeDocumentType` declara qué `DocumentType.code` es `required: true` para cada `aidTypeId`. Al **crear** una solicitud solo se valida la **cédula** (`ID_DOCUMENT`) como obligatoria (`AppError(400, 'MISSING_REQUIRED_DOCUMENT', …)`). Los demás documentos requeridos se muestran como recomendados y pueden adjuntarse después desde el detalle.

## Modelo de datos
### Tablas
- `User`, `OriginType`, `Site`, `AidType`, `AidArea`, `DocumentType`, `AidTypeDocumentType`, `Census`, `CensusDocument`, `AuditLog`.
- `CensusDocument` tiene `kind: DocumentKind` (retrocompatibilidad) Y opcional `documentTypeId` apuntando a `DocumentType` (preferido).
- `AuditLog`: `userId`, `action`, `entity`, `entityId`, `payload` (Json), `createdAt`. FK formal a `User` con `onDelete: SetNull`.
- `AuditLog` registra: login, cambios de estatus, cambios por campo, uploads, deletes, CRUD de catálogos. **No omitir** `audit.service.writeAudit()` en acciones sensibles.

### Catálogos (data-driven, editables por admin)
- **OriginType**: `name` único, `requiresSite` (boolean). Seed: Interno (requiresSite=true), Externo (requiresSite=false).
- **Site**: `name` único. Sedes físicas. Seed vacío (las crea el admin).
- **AidType**: `name` único. Seed: Social, Económica, Médica, Educacional.
- **AidArea**: FK a `AidType`, `name`, `requiresDetail` boolean. Seed: 28 áreas médicas + 5 sociales + 5 económicas + 5 educacionales. @@unique([aidTypeId, name]).
- **DocumentType** (nuevo): `name` único, `code` único, `requiredByDefault` boolean. Seed: ID_DOCUMENT, INVOICE, MEDICAL_REPORT, PROOF_OF_DELIVERY, SCHOLARSHIP_DOC, HOUSING_DOC, ECONOMIC_PROOF.
- **AidTypeDocumentType** (nuevo): PK compuesta (aidTypeId, documentTypeId), `required: boolean`. Seed: por cada AidType declara qué códigos de DocumentType son obligatorios.

### Census (campos clave)
- `fileNumber` (CVM-YYYY-XXXXX), `registrationDate`.
- **Solicitante**: `applicantName`, `applicantIdNumber`, `applicantSex` (Sex).
- **Procedencia**: `originTypeId` (FK OriginType), `siteId?` (FK Site), `originDetail?` (texto libre).
- **Beneficiario**: `beneficiarySameAsApplicant` (default true), si false → `beneficiaryName?`, `beneficiaryIdNumber?`, `beneficiarySex?`.
- **Ayuda**: `aidTypeId` (FK AidType), `aidAreaId` (FK AidArea), `aidAreaOther?` (obligatorio si área requiere detalle), `aidDescription`.
- **Estatus**: `aidStatus` (enum), `aidProvider`, `aidObservation`, `amountUsd`, `amountBs`.
- **Pago**: `paymentRate`, `paymentDate`, `paymentStatus`, `invoicePath`.
- **Documentos**: `idDocumentPath` + `idDocumentTypeId?`, `invoicePath` + `invoiceTypeId?`, filas `CensusDocument` con `documentTypeId?`.
- FKs: `createdById` → User.

## Auditoría y línea de tiempo
- **Backend** `audit.service.ts`: `writeAudit(entry)` y `listAudit(query)`. `listAudit` admite filtros `entity`, `entityId`, `action`, `userId`, `from`, `to`, `page`, `limit` e incluye `user: { id, username, fullName }`.
- **Endpoint**: `GET /api/v1/audit` autenticado.
- **Acciones** registradas: `CREATE_CENSUS`, `UPDATE_CENSUS` (con `payload.fields: { campo: { from, to } }`), `CHANGE_STATUS`, `UPDATE_PAYMENT` (idem), `UPLOAD_DOCUMENT`, `DELETE_DOCUMENT`, `LOGIN`, `LOGOUT`, `CREATE_USER`, `UPDATE_USER`, `CREATE_CATALOG_ITEM`, `UPDATE_CATALOG_ITEM`.
- **Frontend**: `<AuditTimeline entityId={censusId} />` en `components/audit/`. Muestra la línea de tiempo con icono por acción, descripción humana del cambio, usuario y timestamp relativo. Filtros por tipo de evento, paginación.

## Offline (PWA)
- Service Worker vía `vite-plugin-pwa`, runtime caching gestionado por Workbox.
- IndexedDB (Dexie) con stores: `census_drafts`, `pending_mutations`, `cached_catalogs`, `cached_file_numbers`.
- Toda mutación lleva `idempotencyKey` (UUID cliente) para evitar duplicados al sincronizar.
- Drenado de cola automático al detectar `online` + botón "Sincronizar ahora" en `SyncIndicator`.
- Estrategia: `NetworkFirst` para `GET /census/*`, `CacheFirst` para `GET /api/v1/catalogs/*` y `GET /api/v1/document-types/*` (cambian rarísimo), nunca cachear `POST/PATCH`, ni `/api/v1/stats/*`, ni `/api/v1/audit/*`.

## Catálogos (backend → `src/modules/catalogs/`)
- Módulo Express con rutas `GET /api/v1/catalogs/origin-types`, `/sites`, `/aid-types`, `/aid-areas?typeId=`. Todos autenticados.
- POST/PATCH de cada catálogo requiere `requireRole('ADMIN')`. No hay DELETE físico: se usa flag `active` con default `true`.
- Cada creación/actualización registra `writeAudit(action: 'CREATE_CATALOG_ITEM' | 'UPDATE_CATALOG_ITEM')`.
- **Validaciones cruzadas en census service** (no en Zod, porque requieren BD): el área debe pertenecer al tipo de ayuda seleccionado; si `originType.requiresSite` → `siteId` obligatorio; si `aidArea.requiresDetail` → `aidAreaOther` obligatorio; `AidTypeDocumentType` con `required: true` → `documentTypeId` obligatorio (frontend lo valida y backend lo confirma).

## Tipos de documento (backend → `src/modules/documentTypes/`)
- Módulo Express con rutas `GET /api/v1/document-types?aidTypeId=`, `POST /api/v1/document-types`, `PATCH /api/v1/document-types/:id`, `POST /api/v1/document-types/links`, `PATCH/DELETE /api/v1/document-types/links/:aidTypeId/:documentTypeId`. Todas autenticadas; POST/PATCH requieren ADMIN.
- `GET /api/v1/document-types?aidTypeId=<id>` devuelve el catálogo global con `requiredForAidType: boolean` que indica cuáles son obligatorios para ese aidType.
- Mismas reglas de auditoría que `catalogs/`.
- **Frontend**: `useQuery(['documentTypes', aidTypeId])` lo carga al seleccionar tipo de ayuda. Wizard y detalle lo usan para renderizar uploaders dinámicos.

## Gráficos (ECharts)
### Stack
- **Instalación**: `npm install echarts` en el workspace frontend.
- **Importación tree-shakeable** (minimiza bundle): `echarts/core` + `BarChart / PieChart / LineChart` de `echarts/charts` + `GridComponent / TooltipComponent / LegendComponent / TitleComponent` de `echarts/components` + `CanvasRenderer` de `echarts/renderers`. Tipo `ComposeOption` para tipado estricto de opciones.
- **Wrapper** `frontend/src/components/charts/EChart.tsx`:
  - `echarts.init(divRef)` en `useEffect` de montado.
  - `chart.setOption(option)` al cambiar datos (vía `useEffect` dependiente de `option`).
  - `ResizeObserver` sobre el contenedor → `chart.resize()` (responsive).
  - `chart.dispose()` en cleanup del `useEffect` (libera recursos, evita fugas de memoria — tal como indica la doc oficial).
- **Página** `frontend/src/pages/ChartsPage.tsx`:
  - Ruta `/charts`, accesible por todo usuario autenticado.
  - Filtro de rango de fechas (from/to) que alimenta `GET /api/v1/stats/summary`.
  - KPIs: total de solicitudes, monto total USD, monto total Bs.
  - Gráficos: Pie de procedencias (por tipo), Bar de sedes más frecuentes, Bar horizontal de áreas/especialidades más atendidas, Bar/Line de gastos mensuales (USD + Bs, dos series), Pie por tipo de ayuda.
  - Paleta CVM: `['#638c3a', '#1e3a6b', '#E8DCC4', '#C98A2B', '#3F8F4F', '#B23A3A', '#8FA463', '#4A6FA5']`.
  - Estado vacío: "Sin datos en el rango seleccionado".
- **Endpoint backend**: `GET /api/v1/stats/summary?from=&to=` → `{ byOriginType[], bySite[], byAidType[], topAidAreas[], monthlyAmounts[], totals }`. Implementación con Prisma `groupBy` + `$queryRaw` (`date_trunc('month', registrationDate)`). Sumas excluyen `paymentStatus = ANULADO` mediante `IS NULL OR <> 'ANULADO'`. `from` y `to` aceptan tanto `YYYY-MM-DD` como ISO completo: se detecta el formato y se ajusta el fin del día a `T23:59:59.999Z`.
- **PWA**: `/stats/*` sin caché (NetworkOnly); los catálogos que alimentan los selects del wizard se cachean con CacheFirst via Workbox.
- **Nav**: enlace "Gráficos" en `InstitutionalHeader` (todos los usuarios autenticados).

## Branding CVM (no cambiar sin pedido)
Colores en `frontend/tailwind.config.ts`:
- `primary` `#638c3a` (verde olivo) — botones primarios.
- `secondary` `#1e3a6b` (azul marino) — títulos, logo.
- `accent` `#E8DCC4` (crema) — destacados.
- `background` `#FAF8F2` — fondo general.
- Fuente títulos y cuerpo: Georama.

El header (`InstitutionalHeader.tsx` y `LoginPage.tsx`) muestra el título del sistema **"Registro de Solicitudes de Atención al Ciudadano"** debajo del sub-header "Corporación Venezolana de Minería". Carga los logos desde `frontend/public/branding/`. Nombres esperados:
- `logo_ministerio.png` (ente padre, izquierda)
- `logo_cvm.png` (CVM, derecha)

Si falta alguno, se muestra un placeholder con iniciales sobre fondo `secondary`. Ver `frontend/public/branding/README.md` para iconos PWA opcionales.

El PWA manifest (`frontend/vite.config.ts`) usa:
- `name: 'Registro de Solicitudes CVM'`
- `short_name: 'Solicitudes CVM'`
- `description: 'Registro de Solicitudes de Atención al Ciudadano · Corporación Venezolana de Minería'`

## Trampas conocidas
- **Postgres no es Docker**: si un agente intenta `docker-compose up`, fallará. Las instrucciones nativas están en el README.
- **Prisma client regenerado**: tras cambiar `schema.prisma`, correr `npx prisma generate` antes de `npm run dev` o el backend no reconocerá los tipos.
- **Multer + JSON**: el endpoint `POST /census` espera `multipart/form-data`, no JSON. El cliente Axios debe usar `FormData`.
- **Refresh token**: se guarda en cookie `httpOnly` `sameSite=strict`. El `access` va en memoria (Zustand), **no en localStorage**.
- **Archivos en `uploads/`**: nunca versionar. Si un agente hace `git add .` sin revisar, los documentos de los censados se filtran al repo.
- **CORS**: `CORS_ORIGIN` en `.env` debe coincidir exactamente con el origen del frontend (incluyendo puerto) o el refresh silencioso falla.
- **Puerto 4700 ocupado en Windows**: si el dev server no arranca, buscar `node.exe` en el Administrador de tareas o cambiar `PORT` en `.env`.
- **F5 en producción**: el access token está en memoria (Zustand). `RequireAuth` invoca `POST /auth/refresh` con la cookie httpOnly antes de cualquier render. Si la cookie está vencida, redirige a `/login`.

## Consulta pública (backend → `src/modules/public/`)
- Endpoint **público** (sin `requireAuth`): `GET /api/v1/public/consulta?q=<cédula|N° expediente>`. Rate limit ~20/min/IP (mismo shape `{ error: { code, message } }` que login).
- `q` con formato `CVM-YYYY-NNNNN` → busca por `fileNumber` (único). `q` con formato cédula (`cedulaRegex`) → busca el registro más reciente por `applicantIdNumber`.
- Formato inválido → `400 INVALID_QUERY`; no encontrado → `404 NOT_FOUND` con **mensaje genérico** (anti-enumeración).
- **Privacidad**: responde solo `{ fileNumber, aidStatus, aidObservation, aidType.name, aidArea.name, updatedAt }`. Nunca nombre, cédula, montos ni documentos.
- **Frontend**: ruta pública `/consulta` (`pages/ConsultaPage.tsx`, fuera de `RequireAuth`). Enlazada desde `LoginPage`. Header público compartido en `components/layout/PublicHeader.tsx`.

## Producción (despliegue bajo subpath `/oac/`)
- **URL**: la SPA se sirve en `https://cvm.com.ve/oac/`. Todo deriva de `import.meta.env.BASE_URL`:
  - Vite `base: '/oac/'` (`frontend/vite.config.ts`).
  - `frontend/src/lib/api/config.ts` → `API_BASE = <BASE_URL>api/v1` (en prod `/oac/api/v1`), `ROUTER_BASENAME = '/oac'` (usado en `BrowserRouter basename`).
  - Assets de branding se referencian con `import.meta.env.BASE_URL + 'branding/…'`.
  - PWA manifest: `start_url: '/oac/'`, `scope: '/oac/'`, `navigateFallback: '/oac/'`.
- **API**: el frontend llama a `/oac/api/v1/…`. El reverse proxy debe mapear `/oac/api/*` → backend `:4700/api/*` (quitando el prefijo `/oac`). El backend sigue montado en `/api/v1`.
- **Cookie refresh**: en producción `COOKIE_PATH` debe coincidir con el path que ve el navegador, p. ej. `/oac/api/v1/auth` (ver `backend/src/config/env.ts` y `auth.service.ts`). Si no coincide, el refresh silencioso falla.
- **CORS**: `CORS_ORIGIN` debe ser el origen exacto del frontend. En producción same-origin no aplica, pero en dev/pantallas separadas sí.
- **Ejemplo Nginx**:
  ```nginx
  location /oac/api/ {
      proxy_pass http://127.0.0.1:4700/api/;   # quita /oac
      proxy_set_header Host $host;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
  location /oac/ {
      alias /var/www/oac/;      # contenido de frontend/dist/
      try_files $uri $uri/ /oac/index.html;
  }
  ```
- **Build**: `npm run build` → `frontend/dist/` (subir a `/oac/`) + backend con `NODE_ENV=production`.
- **Dev local**: con `base: '/oac/'` el dev server sirve en `http://localhost:4701/oac/`; el proxy de Vite reescribe `/oac/api` → `:4700/api`.

## Verificación antes de commitear (no commitear a menos que el usuario lo pida)
1. `npm run lint` — limpio.
2. `npm run build` — sin errores en ambos workspaces.
3. `npm test` — todos los tests pasan.
4. Probar manualmente login → crear solicitud (con todos los tipos de ayuda) → cambiar estatus → adjuntar documentos por tipo → revisar línea de tiempo.
