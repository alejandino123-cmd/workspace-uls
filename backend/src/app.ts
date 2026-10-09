import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import swaggerJsdoc from "swagger-jsdoc";
import { apiReference } from "@scalar/express-api-reference";
import { pingRouter } from "./routes/ping";

const openApiSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: { title: "Workspace ULS API", version: "1.0.0" },
    servers: [{ url: "http://localhost:3000" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
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

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
});