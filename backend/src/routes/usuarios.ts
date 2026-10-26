import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { validationError } from "../lib/validation";

export const usuariosRouter = Router();
usuariosRouter.use(requireAuth, requireRole("COORDINACION"));

const crearSchema = z.object({
  nombre: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(72),
  rol: z.enum(["COORDINACION", "EMPRESA"]), 
});

/**
 * @openapi
 * /api/v1/usuarios:
 *   post:
 *     tags: [Usuarios]
 *     summary: Crear una cuenta de coordinación o empresa
 *     description: Solo COORDINACION. La contraseña inicial debe cambiarse con PUT /auth/password.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, email, password, rol]
 *             properties:
 *               nombre: { type: string, example: "Ing. Carlos Pérez" }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               rol: { type: string, enum: [COORDINACION, EMPRESA] }
 *     responses:
 *       201:
 *         description: Cuenta creada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       409: { description: El correo ya está registrado }
 */
usuariosRouter.post("/", async (req, res) => {
  const parsed = crearSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationError(parsed.error));
  const { nombre, email, password, rol } = parsed.data;

  if (await prisma.user.findUnique({ where: { email } })) {
    return res.status(409).json({ error: "El correo ya está registrado" });
  }

  const user = await prisma.user.create({
    data: { nombre, email, rol, passwordHash: await bcrypt.hash(password, 10) },
    select: { id: true, email: true, nombre: true, rol: true },
  });
  res.status(201).json({ user });
});