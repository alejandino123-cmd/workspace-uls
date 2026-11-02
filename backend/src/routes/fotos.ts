import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { z } from "zod";
import { config } from "../config";
import { prisma } from "../lib/prisma";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { borrarImagen, detectarTipo, guardarImagen, rutaImagen } from "../lib/imagenes";

export const fotosRouter = Router();

const subirFoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.fotoMaxBytes, files: 1 },
}).single("foto");

// Convierte los errores de multer en respuestas JSON con el código correcto
function recibirFoto(req: Request, res: Response, next: NextFunction) {
  subirFoto(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "La imagen supera el tamaño máximo de 2 MB" });
    }
    if (err) return res.status(400).json({ error: "No se pudo leer la imagen" });
    next();
  });
}

/**
 * @openapi
 * /api/v1/fotos:
 *   put:
 *     tags: [Fotos]
 *     summary: Subir o reemplazar mi foto de perfil
 *     description: >
 *       Cualquier rol con sesión. Formatos JPG, PNG o WEBP, máximo 2 MB. Se valida el contenido
 *       del archivo, no solo su extensión. La foto anterior se borra.
 *     security: [{ bearerAuth: [] }]
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
 *         description: Foto guardada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fotoUrl: { type: string, example: /api/v1/fotos/1 }
 *       400: { description: Falta la imagen o el formato no está permitido }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       413: { description: La imagen supera 2 MB }
 */
fotosRouter.put("/", requireAuth, recibirFoto, async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: "Envía la imagen en el campo 'foto'" });
  const tipo = detectarTipo(req.file.buffer);
  if (!tipo) return res.status(400).json({ error: "Formato no permitido (usa JPG, PNG o WEBP)" });

  const userId = req.user!.id;
  const anterior = await prisma.user.findUnique({ where: { id: userId }, select: { fotoArchivo: true } });
  const archivo = await guardarImagen(req.file.buffer, tipo);
  await prisma.user.update({ where: { id: userId }, data: { fotoArchivo: archivo, fotoTipo: tipo } });
  if (anterior?.fotoArchivo) await borrarImagen(anterior.fotoArchivo);

  res.json({ fotoUrl: `/api/v1/fotos/${userId}` });
});

/**
 * @openapi
 * /api/v1/fotos:
 *   delete:
 *     tags: [Fotos]
 *     summary: Quitar mi foto de perfil
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Foto eliminada (o no había foto) }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 */
fotosRouter.delete("/", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const usuario = await prisma.user.findUnique({ where: { id: userId }, select: { fotoArchivo: true } });
  if (usuario?.fotoArchivo) {
    await prisma.user.update({ where: { id: userId }, data: { fotoArchivo: null, fotoTipo: null } });
    await borrarImagen(usuario.fotoArchivo);
  }
  res.status(204).send();
});

/**
 * @openapi
 * /api/v1/fotos/{userId}:
 *   get:
 *     tags: [Fotos]
 *     summary: Ver la foto de perfil de un usuario
 *     description: No requiere sesión. Devuelve la imagen tal cual (JPG, PNG o WEBP).
 *     parameters:
 *       - { in: path, name: userId, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: La imagen
 *         content:
 *           image/jpeg: { schema: { type: string, format: binary } }
 *           image/png: { schema: { type: string, format: binary } }
 *           image/webp: { schema: { type: string, format: binary } }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       404: { description: El usuario no existe o no tiene foto }
 */
fotosRouter.get("/:userId", async (req, res) => {
  const id = z.coerce.number().int().positive().safeParse(req.params.userId);
  if (!id.success) return res.status(400).json({ error: "El id debe ser un entero positivo" });

  const usuario = await prisma.user.findUnique({
    where: { id: id.data },
    select: { fotoArchivo: true, fotoTipo: true },
  });
  if (!usuario?.fotoArchivo || !usuario.fotoTipo) {
    return res.status(404).json({ error: "Este usuario no tiene foto de perfil" });
  }

  res.setHeader("Content-Type", usuario.fotoTipo);
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.sendFile(rutaImagen(usuario.fotoArchivo));
});
