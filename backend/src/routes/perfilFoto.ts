import { Router, type NextFunction, type Response } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth";
import { borrarFoto, cloudinaryConfigurado, subirFoto } from "../lib/cloudinary";

export const perfilFotoRouter = Router();

// Igual que /perfil: exige sesión y rol ESTUDIANTE
perfilFotoRouter.use(requireAuth, requireRole("ESTUDIANTE"));

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

// La foto se recibe en memoria (no se escribe en disco) y se reenvía a Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
});

// Mismos campos que /perfil, más la foto. fotoPublicId es interno y nunca se devuelve.
const perfilSelect = {
  id: true,
  carnet: true,
  porcentajeAvance: true,
  historialAcademico: true,
  disponibilidad: true,
  habilidades: true,
  fotoUrl: true,
} as const;

// El tipo que declara el navegador se puede falsificar: se revisan los primeros bytes del archivo
function esImagenPermitida(b: Buffer): boolean {
  const jpg = b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png =
    b.length > 8 &&
    b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp =
    b.length > 12 &&
    b.subarray(0, 4).toString("ascii") === "RIFF" &&
    b.subarray(8, 12).toString("ascii") === "WEBP";
  return jpg || png || webp;
}

function requerirCloudinary(_req: AuthRequest, res: Response, next: NextFunction) {
  if (!cloudinaryConfigurado()) {
    return res.status(503).json({ error: "La subida de fotos no está configurada" });
  }
  next();
}

// Convierte los errores de multer (archivo muy grande, etc.) en respuestas 400
function recibirFoto(req: AuthRequest, res: Response, next: NextFunction) {
  upload.single("foto")(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      const error =
        err.code === "LIMIT_FILE_SIZE" ? "La foto pesa más de 2 MB" : "No se pudo leer la foto";
      return res.status(400).json({ error });
    }
    if (err) return next(err);
    next();
  });
}

/**
 * @openapi
 * /api/v1/perfil/foto:
 *   put:
 *     summary: Subir o cambiar mi foto de perfil
 *     description: >
 *       Envía la imagen como multipart/form-data en el campo `foto` (JPG, PNG o WebP, máximo 2 MB).
 *       Se recorta a un cuadrado de 400x400 y se guarda en Cloudinary. Si ya había una foto,
 *       se reemplaza. Solo rol ESTUDIANTE.
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [foto]
 *             properties:
 *               foto: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Perfil con la nueva fotoUrl
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PerfilResponse'
 *       400:
 *         description: Falta la foto, no es JPG/PNG/WebP o pesa más de 2 MB
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       502: { description: Cloudinary no pudo guardar la imagen }
 *       503: { description: La subida de fotos no está configurada }
 *   delete:
 *     summary: Quitar mi foto de perfil
 *     description: Borra la foto actual. Si no había foto, responde igual (es idempotente).
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil sin foto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PerfilResponse'
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 */
perfilFotoRouter.put("/", requerirCloudinary, recibirFoto, async (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Envía una imagen en el campo «foto»" });
  }
  if (!esImagenPermitida(req.file.buffer)) {
    return res.status(400).json({ error: "La foto debe ser JPG, PNG o WebP" });
  }

  const userId = req.user!.id;
  const perfil = await prisma.perfilEstudiante.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { id: true, fotoPublicId: true },
  });

  let nueva: { url: string; publicId: string };
  try {
    nueva = await subirFoto(req.file.buffer, userId);
  } catch (error) {
    console.error("Error al subir la foto a Cloudinary:", error);
    return res.status(502).json({ error: "No se pudo guardar la foto. Intenta de nuevo." });
  }

  const actualizado = await prisma.perfilEstudiante.update({
    where: { id: perfil.id },
    data: { fotoUrl: nueva.url, fotoPublicId: nueva.publicId },
    select: perfilSelect,
  });

  // La foto anterior ya no se usa. Si el borrado falla no importa: la nueva ya quedó guardada.
  if (perfil.fotoPublicId) {
    await borrarFoto(perfil.fotoPublicId).catch((e) =>
      console.error("No se pudo borrar la foto anterior:", e),
    );
  }

  res.json({ perfil: actualizado });
});

perfilFotoRouter.delete("/", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const perfil = await prisma.perfilEstudiante.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { id: true, fotoPublicId: true },
  });

  const actualizado = await prisma.perfilEstudiante.update({
    where: { id: perfil.id },
    data: { fotoUrl: null, fotoPublicId: null },
    select: perfilSelect,
  });

  if (perfil.fotoPublicId) {
    await borrarFoto(perfil.fotoPublicId).catch((e) =>
      console.error("No se pudo borrar la foto de Cloudinary:", e),
    );
  }

  res.json({ perfil: actualizado });
});