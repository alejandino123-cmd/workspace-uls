import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { carnetSchema, validationError } from "../lib/validation";
import { correoInstitucionalSchema, esCorreoInstitucional } from "../lib/institucional";
import { intentosRestantes, limitarPorCorreo, limitarPorUsuario } from "../lib/rate-limit";
import { signToken, signTokenTemporal } from "../lib/tokens";

export const authRouter = Router();

const userSelect = { id: true, email: true, nombre: true, rol: true } as const;

const registerSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es muy corto").max(100),
  email: correoInstitucionalSchema,
  password: z.string().min(8, "Mínimo 8 caracteres").max(72, "Máximo 72 caracteres"),
  carnet: carnetSchema, // obligatorio: el registro público es solo para estudiantes
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

const passwordSchema = z
  .object({
    actual: z.string().min(1),
    nueva: z.string().min(8, "Mínimo 8 caracteres").max(72, "Máximo 72 caracteres"),
  })
  .refine((d) => d.actual !== d.nueva, {
    message: "La nueva contraseña debe ser distinta de la actual",
    path: ["nueva"],
  });

// Hash de referencia: se compara siempre para que el tiempo de respuesta no revele si el correo existe
const HASH_FICTICIO = bcrypt.hashSync("contraseña-ficticia-sin-uso", 10);


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
 *             required: [nombre, email, password, carnet]
 *             properties:
 *               nombre: { type: string, example: Ana López }
 *               email: { type: string, format: email, description: Debe ser correo institucional, example: ana@uls.edu.sv }
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
authRouter.post("/register", limitarPorCorreo, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationError(parsed.error));
  const { nombre, email, password, carnet } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "El correo ya está registrado" });

  const carnetUsado = await prisma.perfilEstudiante.findUnique({ where: { carnet } });
  if (carnetUsado) return res.status(409).json({ error: "El carnet ya está registrado" });

  const passwordHash = await bcrypt.hash(password, 10);
  const creado = await prisma.user.create({
    data: { nombre, email, passwordHash, perfil: { create: { carnet } } },
    select: { ...userSelect, tokenVersion: true },
  });
  const { tokenVersion, ...user } = creado;

  res.status(201).json({ user, token: signToken({ ...user, tokenVersion }) });
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
 *         description: Sesión iniciada, o requiere segundo paso (requiere2fa y tokenTemporal) si la cuenta tiene 2FA
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
authRouter.post("/login", limitarPorCorreo, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationError(parsed.error));
  const { email, password } = parsed.data;

  const found = await prisma.user.findUnique({ where: { email } });
  // Siempre se compara una contraseña, exista o no la cuenta, para no revelar cuál correo está registrado.
  // Una cuenta sin contraseña se trata igual que credenciales erróneas.
  const valida = await bcrypt.compare(password, found?.passwordHash ?? HASH_FICTICIO);
  if (!found || !found.passwordHash || !valida) {
    return res.status(401).json({
      error: "Credenciales inválidas",
      code: "CREDENCIALES_INVALIDAS",
      intentosRestantes: intentosRestantes(req),
    });
  }

  // Con autenticación en dos pasos, aún no se entrega el token de acceso
  if (found.totpActivo) {
    return res.json({ requiere2fa: true, tokenTemporal: signTokenTemporal(found) });
  }

  const user = { id: found.id, email: found.email, nombre: found.nombre, rol: found.rol };
  res.json({ user, token: signToken({ ...user, tokenVersion: found.tokenVersion }) });
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
authRouter.put("/password", requireAuth, limitarPorUsuario, async (req: AuthRequest, res) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationError(parsed.error));

  const found = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!found) return res.status(401).json({ error: "Usuario no encontrado" });
  if (!found.passwordHash) {
    return res.status(400).json({ error: "Tu cuenta no tiene contraseña configurada" });
  }
  if (!(await bcrypt.compare(parsed.data.actual, found.passwordHash))) {
    return res.status(400).json({ error: "La contraseña actual no es correcta" });
  }

  await prisma.user.update({
    where: { id: found.id },
    // Sube tokenVersion: las sesiones abiertas con la contraseña anterior dejan de valer
    data: { passwordHash: await bcrypt.hash(parsed.data.nueva, 10), tokenVersion: { increment: 1 } },
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