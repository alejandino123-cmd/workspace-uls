import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import swaggerJsdoc from "swagger-jsdoc";
import { apiReference } from "@scalar/express-api-reference";
import { apiRouter } from "./routes";
import { cabecerasSeguridad, protegerDocs } from "./middleware/seguridad";

const DESCRIPCION_SEGURIDAD = `
## Seguridad

Cada petición pasa por estas capas (middleware), en orden:

| Capa | Qué hace |
|---|---|
| \`cabecerasSeguridad\` | Cabeceras HTTP: \`nosniff\`, \`X-Frame-Options: DENY\`, \`Referrer-Policy\`, HSTS con HTTPS |
| \`cors\` | Solo acepta los orígenes de \`CORS_ORIGIN\` |
| \`protegerDocs\` | Esta documentación pide usuario y contraseña (\`DOCS_USUARIO\`/\`DOCS_PASSWORD\`); en producción sin ellos queda oculta |
| Límite de intentos | Login, registro, cambio de contraseña y código 2FA: **3 intentos fallidos cada 5 minutos**. Las respuestas 401 traen \`intentosRestantes\`; al agotarlos, 429 con \`reintentarEnSegundos\` |
| \`requireAuth\` | Exige \`Authorization: Bearer <token>\`. Rol y vigencia se leen de la base de datos en cada petición; cambiar la contraseña invalida las sesiones anteriores |
| \`requireRole\` | Cada ruta privada exige su rol: ESTUDIANTE, COORDINACION o EMPRESA |
| Validación (Zod) | Todo cuerpo y parámetro se valida; los errores responden 400 con \`detalles\` |

Otras medidas: contraseñas con bcrypt, verificación en dos pasos (TOTP) con secreto cifrado (AES-256-GCM),
archivos revisados por su contenido real (no por el tipo declarado) y datos personales nunca expuestos al público.

### Códigos de error (\`code\`)
\`CREDENCIALES_INVALIDAS\`, \`CODIGO_INVALIDO\`, \`VERIFICACION_VENCIDA\`, \`DEMASIADOS_INTENTOS\`,
\`CARNET_REQUERIDO\`, \`PERFIL_INCOMPLETO\`.
`;

const openApiSpec = swaggerJsdoc({
  definition: {

    openapi: "3.0.3",
    info: { title: "Workspace ULS API", version: "1.0.0", description: DESCRIPCION_SEGURIDAD },
    servers: [{ url: process.env.PUBLIC_URL ?? "http://localhost:3000" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            email: { type: "string", format: "email", example: "ana@ejemplo.com" },
            nombre: { type: "string", example: "Ana López" },
            rol: { type: "string", enum: ["ESTUDIANTE", "EMPRESA", "COORDINACION"] },
          },
        },
        Perfil: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            carnet: { type: "string", nullable: true, example: "AB2423" },
            porcentajeAvance: { type: "integer", minimum: 0, maximum: 100, example: 60 },
            historialAcademico: { type: "string", nullable: true },
            disponibilidad: {
              type: "string",
              nullable: true,
              enum: ["TIEMPO_COMPLETO", "TIEMPO_PARCIAL", "SOLO_PROYECTOS"],
            },
            habilidades: { type: "array", items: { type: "string" }, example: ["Vue.js", "Node.js"] },
          },
        },
        PerfilResponse: {
          type: "object",
          properties: { perfil: { $ref: "#/components/schemas/Perfil" } },
        },
        Proyecto: {
          type: "object",
          properties: {
            id: { type: "integer" },
            titulo: { type: "string" },
            descripcion: { type: "string" },
            urlRepositorio: { type: "string", nullable: true },
            urlDemo: { type: "string", nullable: true },
            urlDocumentacion: { type: "string", nullable: true },
            tecnologias: { type: "array", items: { type: "string" } },
            estadoValidacion: { type: "string", enum: ["PENDIENTE", "VALIDADO", "RECHAZADO"] },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            validacion: {
              type: "object",
              nullable: true,
              properties: {
                comentario: { type: "string", nullable: true },
                createdAt: { type: "string", format: "date-time" },
              },
            },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            user: { $ref: "#/components/schemas/User" },
            token: { type: "string", example: "eyJhbGciOiJIUzI1NiIs..." },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string", example: "Datos inválidos" },
            code: { type: "string", example: "CREDENCIALES_INVALIDAS", description: "Código estable para el frontend (no siempre presente)" },
            intentosRestantes: { type: "integer", example: 2, description: "Solo en rutas con límite de intentos" },
            reintentarEnSegundos: { type: "integer", example: 240, description: "Solo en 429" },
            detalles: {
              type: "array",
              items: {
                type: "object",
                properties: { campo: { type: "string" }, mensaje: { type: "string" } },
              },
            },
          },
        },
      },
      responses: {
        DatosInvalidos: {
          description: "Datos inválidos",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
        NoAutenticado: {
          description: "Token ausente, inválido o expirado",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
        SinPermiso: {
          description: "No tienes permiso para esta acción",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
});

export const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(cabecerasSeguridad);
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") }));
app.use(express.json({ limit: "100kb" }));

app.get("/openapi.json", protegerDocs, (_req, res) => res.json(openApiSpec));
app.use("/reference", protegerDocs, apiReference({ content: openApiSpec }));

app.use("/api/v1", apiRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (
    typeof err === "object" &&
    err !== null &&
    (err as { type?: string }).type === "entity.parse.failed"
  ) {
    return res.status(400).json({ error: "El cuerpo de la petición no es un JSON válido" });
  }
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
});