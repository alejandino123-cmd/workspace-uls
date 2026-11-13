import { Router, type NextFunction, type Response } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth";
import { borrarCv, cloudinaryConfigurado, subirCv } from "../lib/cloudinary";

export const perfilCvRouter = Router();

// Igual que /perfil: exige sesión y rol ESTUDIANTE
perfilCvRouter.use(requireAuth, requireRole("ESTUDIANTE"));

const MAX_BYTES_CV = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES_CV, files: 1 },
});

// Un PDF real empieza con "%PDF-"; no se confía en el tipo que declara el navegador
function esPdf(b: Buffer): boolean {
  return b.length > 5 && b.subarray(0, 5).toString("ascii") === "%PDF-";
}

function requerirCloudinary(_req: AuthRequest, res: Response, next: NextFunction) {
  if (!cloudinaryConfigurado()) {
    return res.status(503).json({ error: "La subida de archivos no está configurada" });
  }
  next();
}

function recibirCv(req: AuthRequest, res: Response, next: NextFunction) {
  upload.single("cv")(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      const error = err.code === "LIMIT_FILE_SIZE" ? "El CV pesa más de 5 MB" : "No se pudo leer el archivo";
      return res.status(400).json({ error });
    }
    if (err) return next(err);
    next();
  });
}

/**
 * @openapi
 * /api/v1/perfil/cv:
 *   put:
 *     summary: Subir o reemplazar mi CV
 *     description: PDF en el campo `cv` de multipart/form-data, máximo 5 MB. Reemplaza el anterior.
 *     tags: [Perfil]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [cv]
 *             properties:
 *               cv: { type: string, format: binary }
 *     responses:
 *       200: { description: Perfil con cvUrl }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       503: { description: La subida no está configurada }
 *   delete:
 *     summary: Quitar mi CV
 *     tags: [Perfil]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Perfil sin CV }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 */
perfilCvRouter.put("/", requerirCloudinary, recibirCv, async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: "Envía el CV en el campo «cv»" });
  if (!esPdf(req.file.buffer)) return res.status(400).json({ error: "El CV debe ser un archivo PDF" });

  const userId = req.user!.id;
  const perfil = await prisma.perfilEstudiante.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { id: true, cvPublicId: true },
  });

  const subida = await subirCv(req.file.buffer, userId).catch((e) => {
    console.error("No se pudo subir el CV:", e);
    return null;
  });
  if (!subida) return res.status(502).json({ error: "No se pudo guardar el CV. Intenta de nuevo." });

  const actualizado = await prisma.perfilEstudiante.update({
    where: { id: perfil.id },
    data: { cvUrl: subida.url, cvPublicId: subida.publicId },
    select: { cvUrl: true },
  });

  if (perfil.cvPublicId) {
    await borrarCv(perfil.cvPublicId).catch((e) => console.error("No se pudo borrar el CV anterior:", e));
  }
  res.json({ cvUrl: actualizado.cvUrl });
});

perfilCvRouter.delete("/", async (req: AuthRequest, res) => {
  const perfil = await prisma.perfilEstudiante.upsert({
    where: { userId: req.user!.id },
    create: { userId: req.user!.id },
    update: {},
    select: { id: true, cvPublicId: true },
  });

  await prisma.perfilEstudiante.update({
    where: { id: perfil.id },
    data: { cvUrl: null, cvPublicId: null },
  });
  if (perfil.cvPublicId) {
    await borrarCv(perfil.cvPublicId).catch((e) => console.error("No se pudo borrar el CV:", e));
  }
  res.json({ cvUrl: null });
});
