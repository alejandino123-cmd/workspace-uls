# Workspace ULS

Plataforma de portafolios académicos para los estudiantes de Ciencias de la Computación de la Universidad Luterana Salvadoreña (ULS).

Cada estudiante arma su portafolio con perfil, habilidades, CV y proyectos. La coordinación académica valida o rechaza cada proyecto, y solo lo validado y publicado es visible para visitantes y empresas, que además pueden consultar a un asistente con IA.

## Qué incluye

| Rol | Qué puede hacer |

| Estudiante | Registrarse con su correo institucional, completar su perfil (foto, CV, habilidades, redes), crear proyectos con imagen, enlaces y tecnologías, y activar la verificación en dos pasos. |
| Coordinación | Revisar proyectos pendientes, validar o rechazar con comentario, marcar destacados y buscar estudiantes por carnet, nombre o correo. |
| Visitante | Explorar proyectos y portafolios publicados sin cuenta y usar el asistente con IA. |
| Empresa | El rol existe en la API; todavía no tiene pantallas propias. |

Un proyecto nuevo o editado queda pendiente hasta que la coordinación lo valida (opcionalmente con comentario) o lo rechaza (con motivo obligatorio).

# Tecnologías

- Frontend: Vue 3, TypeScript, Vite, Pinia, Vue Router, TanStack Query, PrimeVue (tema Aura personalizado) y Tailwind CSS 4.
- Backend: Node.js, Express 5, TypeScript, Zod, Prisma 7 y PostgreSQL.
- Servicios: Cloudinary (fotos, imágenes de proyecto y CV) y Groq (asistente con IA).
- Seguridad: JWT, bcrypt, verificación en dos pasos (TOTP) y límites de intentos.
- Pruebas y documentación: Jest, Supertest y OpenAPI con Scalar.

# Estructura

```
workspace-uls/
├── backend/    API REST (Express + Prisma)
│   ├── prisma/     esquema y migraciones
│   ├── scripts/    crear-admin
│   ├── src/        routes, controllers, lib, middleware
│   └── tests/      pruebas de integración
└── frontend/   aplicación Vue
    └── src/        views, components, layouts, router, service, queries, stores
```

# Puesta en marcha

Requisitos: Node.js 22.18 o superior y PostgreSQL. Cloudinary y Groq son opcionales: sin ellos solo fallan las subidas de archivos y el chatbot.

# Backend

```bash
cd backend
cp .env.example .env      # completa las variables (ver tabla)
npm install
npx prisma migrate deploy
npm run crear-admin       # crea la primera cuenta de coordinación
npm run dev               # API en http://localhost:3000
```

| Variable | Uso |

| 'DATABASE_URL' | Base de datos principal |
| 'DATABASE_URL_TEST' | Base de datos para las pruebas |
| 'JWT_SECRET', 'JWT_EXPIRES_IN' | Firma y vigencia de la sesión (1 día por defecto) |
| 'CIFRADO_KEY' | Clave de 32 bytes en base64 para cifrar el secreto de la verificación en dos pasos |
| 'CORS_ORIGIN', 'PORT' | Origen permitido del frontend y puerto (3000 por defecto) |
| 'DOMINIO_INSTITUCIONAL' | Dominio del correo de estudiantes (`uls.edu.sv` por defecto) |
| 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET' | Fotos, imágenes y CV |
| 'GROQ_API_KEY', `GROQ_MODEL', 'GROQ_FALLBACK_MODEL' | Asistente con IA (el modelo de respaldo es opcional) |
| 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'ADMIN_NOMBRE' | Solo para `npm run crear-admin` |

### Frontend

```bash
cd frontend
npm install
npm run dev               # aplicación en modo desarrollo
```

El frontend se conecta a `http://localhost:3000/api/v1`; cámbialo con `VITE_API_URL`.

# Comandos útiles

| Dónde | Comando | Qué hace |

| `backend` | `npm test` | Pruebas (necesita `DATABASE_URL_TEST`) |
| `backend` | `npm run build` | Genera el cliente de Prisma y compila |
| `frontend` | `npm run build` | Revisa tipos y genera el build de producción |

# API

Con el backend corriendo:

- Referencia interactiva: `http://localhost:3000/reference`
- Especificación OpenAPI: `http://localhost:3000/openapi.json`

Todas las rutas cuelgan de `/api/v1`.

# Pantallas

Públicas: `/` (portada), `/proyectos` y `/proyectos/:id`, `/portafolios` y `/portafolios/:userId`, `/login`, `/register`.

Estudiante: `/mis-proyectos`, `/perfil`, `/perfil/editar`.

Coordinación: `/admin` (validaciones), `/admin/estudiantes`, `/admin/estudiantes/:id`.

# Seguridad en pocas líneas

- Los estudiantes solo se registran con correo institucional.
- Cada endpoint privado exige el rol correspondiente.
- La sesión se invalida al cambiar la contraseña.
- El público y el asistente nunca ven correos, carnets ni datos de contacto.
- El archivo `.env` no se sube a git.

# Interfaz

Un único tema oscuro azul, sin selector de modo, con barra lateral de navegación en las zonas pública y privada.
