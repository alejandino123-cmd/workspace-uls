import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const authRouter = Router();

const registerSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es muy corto").max(100),
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72, "Máximo 72 caracteres"),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

const userSelect = { id: true, email: true, nombre: true, rol: true } as const;

function signToken(user: { id: number; rol: string }) {
  return jwt.sign({ rol: user.rol }, config.jwtSecret, {
    subject: String(user.id),
    expiresIn: config.jwtExpiresIn as SignOptions["expiresIn"],
  });
}

function validationError(error: z.ZodError) {
  return {
    error: "Datos inválidos",
    detalles: error.issues.map((i) => ({ campo: i.path.join("."), mensaje: i.message })),
  };
}

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     summary: Registrar un usuario (rol ESTUDIANTE)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, email, password]
 *             properties:
 *               nombre: { type: string, example: Ana López }
 *               email: { type: string, format: email, example: ana@ejemplo.com }
 *               password: { type: string, minLength: 8, example: Clave12345 }
 *     responses:
 *       201:
 *         description: Usuario creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: El correo ya está registrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationError(parsed.error));
  const { nombre, email, password } = parsed.data;

  if (config.emailDomain && !email.endsWith(`@${config.emailDomain}`)) {
    return res.status(400).json({
      error: "Datos inválidos",
      detalles: [{ campo: "email", mensaje: `Usa tu correo institucional (@${config.emailDomain})` }],
    });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "El correo ya está registrado" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { nombre, email, passwordHash },
    select: userSelect,
  });

  res.status(201).json({ user, token: signToken(user) });
});

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: ana@ejemplo.com }
 *               password: { type: string, example: Clave12345 }
 *     responses:
 *       200:
 *         description: Sesión iniciada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationError(parsed.error));
  const { email, password } = parsed.data;

  const found = await prisma.user.findUnique({ where: { email } });
  const valid = found ? await bcrypt.compare(password, found.passwordHash) : false;
  if (!found || !valid) return res.status(401).json({ error: "Credenciales inválidas" });

  const user = { id: found.id, email: found.email, nombre: found.nombre, rol: found.rol };
  res.json({ user, token: signToken(user) });
});

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     summary: Datos del usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usuario autenticado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Token ausente, inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
authRouter.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: userSelect,
  });
  if (!user) return res.status(401).json({ error: "Usuario no encontrado" });
  res.json({ user });
});