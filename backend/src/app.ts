import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import swaggerJsdoc from "swagger-jsdoc";
import { apiReference } from "@scalar/express-api-reference";
import { pingRouter } from "./routes/ping";
import { authRouter } from "./routes/auth";
import { requireAuth } from "./middleware/auth";
import { perfilRouter } from "./routes/perfil";


const openApiSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: { title: "Workspace ULS API", version: "1.0.0" },
    servers: [{ url: "http://localhost:3000" }],
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
        rol: { type: "string", enum: ["ESTUDIANTE", "DOCENTE", "EMPRESA", "COORDINACION"] },
      },
    },

    Perfil: {
      type: "object",
      properties: {
      id: { type: "integer", example: 1 },
      porcentajeAvance: { type: "integer", minimum: 0, maximum: 100, example: 60 },
      historialAcademico: { type: "string", nullable: true },
      disponibilidad: {
      type: "string",
      nullable: true,
      enum: ["TIEMPO_COMPLETO", "TIEMPO_PARCIAL", "SOLO_PROYECTOS"],
    },
    habilidades: {
      type: "array",
      items: { type: "string" },
      example: ["Vue.js", "Node.js"],
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
},
},
  apis: ["./src/routes/*.ts"],
});

export const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") }));
app.use(express.json());

app.get("/openapi.json", (_req, res) => res.json(openApiSpec));
app.use("/reference", apiReference({ content: openApiSpec }));

app.use("/api/v1", pingRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/perfil", requireAuth, perfilRouter);

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