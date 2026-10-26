import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { verifyGoogleToken } from "../lib/google";
import { carnetSchema, validationError } from "../lib/validation";

export const authRouter = Router();

const userSelect = { id: true, email: true, nombre: true, rol: true } as const;

const registerSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es muy corto").max(100),
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72, "Máximo 72 caracteres"),
  carnet: carnetSchema.optional(), // opcional para COORDINACION y EMPRESA
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

const googleSchema = z.object({ idToken: z.string().min(20) });

const passwordSchema = z
  .object({
    actual: z.string().min(1),
    nueva: z.string().min(8, "Mínimo 8 caracteres").max(72, "Máximo 72 caracteres"),
  })
  .refine((d) => d.actual !== d.nueva, {
    message: "La nueva contraseña debe ser distinta de la actual",
    path: ["nueva"],
  });

function signToken(user: { id: number; rol: string }) {
  return jwt.sign({ rol: user.rol }, config.jwtSecret, {
    subject: String(user.id),
    expiresIn: config.jwtExpiresIn as SignOptions["expiresIn"],
  });
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
 *               carnet: { type: string, example: AB2453 }
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
  const { nombre, email, password, carnet } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "El correo ya está registrado" });

  if (carnet) {
  const carnetUsado = await prisma.perfilEstudiante.findUnique({ where: { carnet } });
  if (carnetUsado) return res.status(409).json({ error: "El carnet ya está registrado" });
}

const passwordHash = await bcrypt.hash(password, 10);
const user = await prisma.user.create({
  data: { nombre, email, passwordHash, ...(carnet ? { perfil: { create: { carnet } } } : {}) },
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
  // Una cuenta creada solo con Google no tiene contraseña: se trata igual que credenciales erróneas
  const valid = found?.passwordHash ? await bcrypt.compare(password, found.passwordHash) : false;
  if (!found || !valid) return res.status(401).json({ error: "Credenciales inválidas" });

  const user = { id: found.id, email: found.email, nombre: found.nombre, rol: found.rol };
  res.json({ user, token: signToken(user) });
});

/**
 * @openapi
 * /api/v1/auth/google:
 *   post:
 *     summary: Iniciar sesión (o registrarse) con Google
 *     description: >
 *       Recibe el ID token que entrega Google Identity Services al frontend.
 *       Si el correo ya existe, se vincula a la misma cuenta; si no, se crea un ESTUDIANTE.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken: { type: string }
 *     responses:
 *       200:
 *         description: Sesión iniciada con una cuenta existente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       201:
 *         description: Cuenta de estudiante creada
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
 *         description: Token de Google inválido o correo no verificado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       503:
 *         description: Inicio de sesión con Google no configurado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
authRouter.post("/google", async (req, res) => {
  if (!config.googleClientId) {
    return res.status(503).json({ error: "El inicio de sesión con Google no está configurado" });
  }
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationError(parsed.error));

  let identity;
  try {
    identity = await verifyGoogleToken(parsed.data.idToken);
  } catch {
    return res.status(401).json({ error: "Token de Google inválido" });
  }
  if (!identity.emailVerified) {
    return res.status(401).json({ error: "El correo de la cuenta de Google no está verificado" });
  }

  // 1) ¿ya entró antes con Google?  2) ¿existe con ese correo?  3) cuenta nueva
  let found = await prisma.user.findUnique({ where: { googleId: identity.sub } });
  let created = false;

  if (!found) {
    const byEmail = await prisma.user.findUnique({ where: { email: identity.email } });
    if (byEmail) {
      // Vincula: es la misma persona porque Google garantiza que el correo es suyo
      found = await prisma.user.update({
        where: { id: byEmail.id },
        data: { googleId: identity.sub },
      });
    } else {
      found = await prisma.user.create({
        data: { email: identity.email, nombre: identity.nombre, googleId: identity.sub },
      });
      created = true;
    }
  }

  const user = { id: found.id, email: found.email, nombre: found.nombre, rol: found.rol };
  res.status(created ? 201 : 200).json({ user, token: signToken(user) });
});

/**
 * @openapi
 * /api/v1/auth/password:
 *   put:
 *     summary: Cambiar mi contraseña
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [actual, nueva]
 *             properties:
 *               actual: { type: string }
 *               nueva: { type: string, minLength: 8, maxLength: 72 }
 *     responses:
 *       204:
 *         description: Contraseña actualizada
 *       400:
 *         description: Datos inválidos, contraseña actual incorrecta o cuenta sin contraseña
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Token ausente, inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
authRouter.put("/password", requireAuth, async (req: AuthRequest, res) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationError(parsed.error));

  const found = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!found) return res.status(401).json({ error: "Usuario no encontrado" });
  if (!found.passwordHash) {
    return res.status(400).json({ error: "Tu cuenta usa Google y no tiene contraseña" });
  }
  if (!(await bcrypt.compare(parsed.data.actual, found.passwordHash))) {
    return res.status(400).json({ error: "La contraseña actual no es correcta" });
  }

  await prisma.user.update({
    where: { id: found.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.nueva, 10) },
  });
  res.status(204).send();
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