import { Router } from "express";
import { createHash, randomBytes } from "node:crypto";
import QRCode from "qrcode";
import { generateSecret, generateURI, verify } from "otplib";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { cifrar, descifrar } from "../lib/cifrado";
import { signToken, verifyTokenTemporal } from "../lib/tokens";
import { limitarPorTokenTemporal } from "../lib/rate-limit";
import { validationError } from "../lib/validation";

export const dosPasosRouter = Router();

// Segundos de tolerancia para el reloj del celular (un código antes o después)
const TOLERANCIA_SEGUNDOS = 30;
const CODIGOS_RESPALDO = 8;

const sha256 = (texto: string) => createHash("sha256").update(texto).digest("hex");

// Quita espacios y guiones, y pasa a mayúsculas: "abcde-fghij" equivale a "ABCDEFGHIJ"
const normalizar = (codigo: string) => codigo.replace(/[\s-]/g, "").toUpperCase();

const codigoSchema = z.object({ codigo: z.string().trim().min(6).max(16) });

function generarCodigosRespaldo() {
  const codigos = Array.from({ length: CODIGOS_RESPALDO }, () => {
    const hex = randomBytes(5).toString("hex").toUpperCase();
    return `${hex.slice(0, 5)}-${hex.slice(5)}`;
  });
  return { codigos, hashes: codigos.map((c) => sha256(normalizar(c))) };
}

// Acepta un código de 6 dígitos de la app o un código de respaldo (se consume al usarlo)
async function verificarSegundoPaso(
  usuario: { id: number; totpSecretoCifrado: string | null; codigosRespaldo: string[] },
  codigo: string,
): Promise<boolean> {
  const limpio = normalizar(codigo);

  if (/^\d{6}$/.test(limpio)) {
    if (!usuario.totpSecretoCifrado) return false;
    const resultado = await verify({
      secret: descifrar(usuario.totpSecretoCifrado),
      token: limpio,
      epochTolerance: TOLERANCIA_SEGUNDOS,
    });
    return resultado.valid;
  }

  const hash = sha256(limpio);
  if (!usuario.codigosRespaldo.includes(hash)) return false;
  // El filtro "has" hace que, si dos peticiones usan el mismo código a la vez, solo una gane
  const { count } = await prisma.user.updateMany({
    where: { id: usuario.id, codigosRespaldo: { has: hash } },
    data: { codigosRespaldo: usuario.codigosRespaldo.filter((h) => h !== hash) },
  });
  return count === 1;
}

/**
 * @openapi
 * /api/v1/auth/2fa/configurar:
 *   post:
 *     tags: [Autenticación 2FA]
 *     summary: Paso 1 de 2 para activar la autenticación en dos pasos
 *     description: >
 *       Genera un secreto nuevo y devuelve el código QR para escanear con una app de códigos
 *       (Google Authenticator, Microsoft Authenticator, etc.). Todavía no se activa: hay que confirmarlo con /activar.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Secreto y código QR
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 secreto: { type: string, description: Para ingresarlo a mano si no se puede escanear }
 *                 otpauthUrl: { type: string }
 *                 qr: { type: string, description: Imagen PNG en data URL }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       409: { description: La autenticación en dos pasos ya está activa }
 */
dosPasosRouter.post("/configurar", requireAuth, async (req: AuthRequest, res) => {
  const usuario = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { email: true, totpActivo: true },
  });
  if (!usuario) return res.status(401).json({ error: "Usuario no encontrado" });
  if (usuario.totpActivo) return res.status(409).json({ error: "La autenticación en dos pasos ya está activa" });

  const secreto = generateSecret();
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { totpSecretoCifrado: cifrar(secreto) },
  });

  const otpauthUrl = generateURI({ issuer: "Workspace ULS", label: usuario.email, secret: secreto });
  const qr = await QRCode.toDataURL(otpauthUrl);
  res.status(201).json({ secreto, otpauthUrl, qr });
});

/**
 * @openapi
 * /api/v1/auth/2fa/activar:
 *   post:
 *     tags: [Autenticación 2FA]
 *     summary: Paso 2 de 2 para activar la autenticación en dos pasos
 *     description: >
 *       Confirma con un código de la app. Al activarse, devuelve 8 códigos de respaldo que solo se muestran esta vez.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [codigo]
 *             properties:
 *               codigo: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: 2FA activada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 codigosRespaldo: { type: array, items: { type: string }, example: ["A1B2C-D3E4F"] }
 *       400: { description: Código incorrecto o no hay configuración pendiente }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       409: { description: Ya estaba activa }
 */
dosPasosRouter.post("/activar", requireAuth, async (req: AuthRequest, res) => {
  const parsed = codigoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationError(parsed.error));

  const usuario = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { totpActivo: true, totpSecretoCifrado: true },
  });
  if (!usuario?.totpSecretoCifrado) {
    return res.status(400).json({ error: "Primero configura la aplicación de códigos" });
  }
  if (usuario.totpActivo) return res.status(409).json({ error: "La autenticación en dos pasos ya está activa" });

  const resultado = await verify({
    secret: descifrar(usuario.totpSecretoCifrado),
    token: normalizar(parsed.data.codigo),
    epochTolerance: TOLERANCIA_SEGUNDOS,
  });
  if (!resultado.valid) return res.status(400).json({ error: "El código no es correcto" });

  const { codigos, hashes } = generarCodigosRespaldo();
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { totpActivo: true, codigosRespaldo: hashes },
  });
  res.json({ codigosRespaldo: codigos });
});

/**
 * @openapi
 * /api/v1/auth/2fa/desactivar:
 *   post:
 *     tags: [Autenticación 2FA]
 *     summary: Desactivar la autenticación en dos pasos
 *     description: Pide un código de la app o un código de respaldo para confirmar.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [codigo]
 *             properties:
 *               codigo: { type: string }
 *     responses:
 *       204: { description: Desactivada }
 *       400: { description: Código incorrecto o la 2FA no está activa }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 */
dosPasosRouter.post("/desactivar", requireAuth, async (req: AuthRequest, res) => {
  const parsed = codigoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationError(parsed.error));

  const usuario = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, totpActivo: true, totpSecretoCifrado: true, codigosRespaldo: true },
  });
  if (!usuario?.totpActivo) return res.status(400).json({ error: "La autenticación en dos pasos no está activa" });
  if (!(await verificarSegundoPaso(usuario, parsed.data.codigo))) {
    return res.status(400).json({ error: "El código no es correcto" });
  }

  await prisma.user.update({
    where: { id: usuario.id },
    data: { totpActivo: false, totpSecretoCifrado: null, codigosRespaldo: [] },
  });
  res.status(204).send();
});

/**
 * @openapi
 * /api/v1/auth/2fa/verificar:
 *   post:
 *     tags: [Autenticación 2FA]
 *     summary: Segundo paso del inicio de sesión
 *     description: >
 *       Se usa después de /auth/login cuando la respuesta trae requiere2fa. Recibe el tokenTemporal
 *       (vence en 5 minutos) y el código de la app o un código de respaldo. Tras 3 códigos incorrectos
 *       con el mismo tokenTemporal, hay que volver a iniciar sesión.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tokenTemporal, codigo]
 *             properties:
 *               tokenTemporal: { type: string }
 *               codigo: { type: string }
 *     responses:
 *       200:
 *         description: Sesión iniciada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { description: Código incorrecto o sesión de verificación vencida }
 *       429: { description: Demasiados intentos fallidos }
 */
dosPasosRouter.post("/verificar", limitarPorTokenTemporal, async (req, res) => {
  const parsed = z
    .object({ tokenTemporal: z.string().min(1), codigo: z.string().trim().min(6).max(16) })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationError(parsed.error));

  const vencida = { error: "La verificación venció. Vuelve a iniciar sesión" };
  let payload;
  try {
    payload = verifyTokenTemporal(parsed.data.tokenTemporal);
  } catch {
    return res.status(401).json(vencida);
  }
  const id = Number(payload.sub);
  if (!Number.isInteger(id)) return res.status(401).json(vencida);

  const usuario = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      nombre: true,
      rol: true,
      tokenVersion: true,
      totpActivo: true,
      totpSecretoCifrado: true,
      codigosRespaldo: true,
    },
  });
  if (!usuario || !usuario.totpActivo || payload.ver !== usuario.tokenVersion) {
    return res.status(401).json(vencida);
  }
  if (!(await verificarSegundoPaso(usuario, parsed.data.codigo))) {
    return res.status(401).json({ error: "El código no es correcto" });
  }

  const user = { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol };
  res.json({ user, token: signToken({ ...user, tokenVersion: usuario.tokenVersion }) });
});

// Estado de la autenticación en dos pasos del usuario autenticado (para la pantalla de seguridad)
dosPasosRouter.get("/estado", requireAuth, async (req: AuthRequest, res) => {
  const usuario = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { totpActivo: true },
  });
  res.json({ activo: Boolean(usuario?.totpActivo) });
});
