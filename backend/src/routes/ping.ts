import { Router } from "express";

export const pingRouter = Router();

/**
 * @openapi
 * /api/v1/ping:
 *   get:
 *     summary: Comprobar que el servidor responde
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: El servidor está activo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
pingRouter.get("/ping", (_req, res) => {
  res.json({ status: "ok" });
});