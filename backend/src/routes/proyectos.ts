import { Router, type Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth";
import { etiquetasSchema, validationError } from "../lib/validation";
import multer from "multer";
import { borrarFoto, cloudinaryConfigurado, subirImagenProyecto } from "../lib/cloudinary";
import { MAX_BYTES_IMAGEN, esImagenPermitida } from "../lib/imagen";
import { errorPerfilIncompleto, requisitosDe } from "../lib/publicacion";
import { registrarEvento, reiniciarRevision } from "../lib/historial";

export const proyectosRouter = Router();
proyectosRouter.use(requireAuth, requireRole("ESTUDIANTE"));

// Solo http/https; "" o null limpian el campo
const urlSchema = z
  .string()
  .trim()
  .max(500)
  .url()
  .refine((u) => /^https?:\/\//i.test(u), "La URL debe empezar con http:// o https://");

const camposSchema = z.object({
  titulo: z.string().trim().min(3).max(120),
  descripcion: z.string().trim().min(10).max(2000),
  urlRepositorio: urlSchema.nullable(),
  urlDemo: urlSchema.nullable(),
  urlDocumentacion: urlSchema.nullable(),
  tecnologias: etiquetasSchema,
  // Solo los proyectos VALIDADOS y publicados aparecen en el portafolio público
  publicado: z.boolean(),
});

const createSchema = camposSchema.partial({
  urlRepositorio: true,
  urlDemo: true,
  urlDocumentacion: true,
  tecnologias: true,
  publicado: true,
});

const updateSchema = camposSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Envía al menos un campo para actualizar");

const idSchema = z.coerce.number().int().positive();

const proyectoSelect = {
  id: true,
  titulo: true,
  descripcion: true,
  urlRepositorio: true,
  urlDemo: true,
  urlDocumentacion: true,
  tecnologias: true,
  imagenUrl: true,
  estadoValidacion: true,
  publicado: true,
  destacado: true,
  fechaLimiteCorreccion: true,
  createdAt: true,
  updatedAt: true,
  validacion: { select: { comentario: true, createdAt: true } },
} as const;

// El perfil se crea al primer uso (mismo patrón get-or-create de /perfil)
async function perfilDe(userId: number) {
  return prisma.perfilEstudiante.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { id: true, carnet: true },
  });
}

function parseId(raw: unknown, res: Response) {
  const r = idSchema.safeParse(raw);
  if (!r.success) {
    res.status(400).json({ error: "El id debe ser un entero positivo" });
    return null;
  }
  return r.data;
}

/**
 * @openapi
 * /api/v1/proyectos:
 *   post:
 *     tags: [Proyectos]
 *     summary: Crear un proyecto en mi portafolio
 *     description: Nace con estado PENDIENTE. Solo rol ESTUDIANTE.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [titulo, descripcion]
 *             properties:
 *               titulo: { type: string, example: "Sistema de inventario" }
 *               descripcion: { type: string, example: "App web para controlar inventario de una tienda." }
 *               urlRepositorio: { type: string, nullable: true, example: "https://github.com/usuario/inventario" }
 *               urlDemo: { type: string, nullable: true }
 *               urlDocumentacion: { type: string, nullable: true }
 *               tecnologias: { type: array, items: { type: string }, example: ["Vue", "Node.js"] }
 *               publicado: { type: boolean, default: false, description: "Si aparece en el portafolio público (requiere estar VALIDADO y perfil con foto, biografía y habilidades)" }
 *     responses:
 *       201:
 *         description: Proyecto creado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Proyecto' }
 *       400: { description: "Datos inválidos, o perfil incompleto para publicar (code PERFIL_INCOMPLETO, con `faltantes`)" }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       403: { description: "Sin permiso, o carnet no registrado (code CARNET_REQUERIDO)" }
 *   get:
 *     tags: [Proyectos]
 *     summary: Listar mis proyectos
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista (más recientes primero)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Proyecto' }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       403: { description: "Sin permiso, o carnet no registrado (code CARNET_REQUERIDO)" }
 */
proyectosRouter.post("/", async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationError(parsed.error));

  const perfil = await perfilDe(req.user!.id);
  if (!perfil.carnet) {
    return res.status(403).json({
      error: "Registra tu carnet en tu perfil antes de enviar proyectos",
      code: "CARNET_REQUERIDO",
    });
  }

  if (parsed.data.publicado) {
    const requisitos = await requisitosDe(req.user!.id);
    if (!requisitos.cumple) return res.status(400).json(errorPerfilIncompleto(requisitos));
  }

  const proyecto = await prisma.$transaction(async (tx) => {
    const creado = await tx.proyecto.create({
      data: { perfilId: perfil.id, ...parsed.data },
      select: proyectoSelect,
    });
    await registrarEvento(tx, { proyectoId: creado.id, evento: "CREADO", actorId: req.user!.id });
    return creado;
  });

  res.status(201).json(proyecto);
});

/**
 * @openapi
 * /api/v1/proyectos/requisitos-publicacion:
 *   get:
 *     tags: [Proyectos]
 *     summary: ¿Mi perfil cumple los requisitos para publicar proyectos?
 *     description: Para publicar se necesita foto de perfil, biografía y al menos una habilidad.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Resultado de la revisión
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cumple: { type: boolean }
 *                 faltantes: { type: array, items: { type: string }, example: ["Biografía"] }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 */
proyectosRouter.get("/requisitos-publicacion", async (req: AuthRequest, res) => {
  res.json(await requisitosDe(req.user!.id));
});

proyectosRouter.get("/", async (req: AuthRequest, res) => {
  const proyectos = await prisma.proyecto.findMany({
    where: { perfil: { userId: req.user!.id } },
    orderBy: { createdAt: "desc" },
    select: proyectoSelect,

  });
  res.json(proyectos);
});

/**
 * @openapi
 * /api/v1/proyectos/{id}:
 *   get:
 *     tags: [Proyectos]
 *     summary: Ver uno de mis proyectos
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: El proyecto
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Proyecto' }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       403: { description: "Sin permiso, o carnet no registrado (code CARNET_REQUERIDO)" }
 *       404: { description: No existe o no es tuyo }
 *   put:
 *     tags: [Proyectos]
 *     summary: Actualizar mi proyecto (parcial)
 *     description: >
 *       Solo se cambian los campos enviados. Al editar el contenido, el estado vuelve a PENDIENTE
 *       (si estaba RECHAZADO queda registrado como corrección). Cambiar solo `publicado` no reinicia la revisión;
 *       para publicar, el perfil debe tener foto, biografía y al menos una habilidad (si no, 400 PERFIL_INCOMPLETO).
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo: { type: string }
 *               descripcion: { type: string }
 *               urlRepositorio: { type: string, nullable: true }
 *               urlDemo: { type: string, nullable: true }
 *               urlDocumentacion: { type: string, nullable: true }
 *               tecnologias: { type: array, items: { type: string } }
 *               publicado: { type: boolean, description: Activa o desactiva la publicación en el portafolio público }
 *     responses:
 *       200:
 *         description: Proyecto actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Proyecto' }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       403: { description: "Sin permiso, o carnet no registrado (code CARNET_REQUERIDO)" }
 *       404: { description: No existe o no es tuyo }
 *   delete:
 *     tags: [Proyectos]
 *     summary: Eliminar mi proyecto
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       204: { description: Eliminado }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       403: { description: "Sin permiso, o carnet no registrado (code CARNET_REQUERIDO)" }
 *       404: { description: No existe o no es tuyo }
 */
proyectosRouter.get("/:id", async (req: AuthRequest, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const proyecto = await prisma.proyecto.findFirst({
    where: { id, perfil: { userId: req.user!.id } },
    select: proyectoSelect,
  });
  if (!proyecto) return res.status(404).json({ error: "Proyecto no encontrado" });
  res.json(proyecto);
});

proyectosRouter.put("/:id", async (req: AuthRequest, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationError(parsed.error));

  const userId = req.user!.id;
  const actual = await prisma.proyecto.findFirst({
    where: { id, perfil: { userId } },
    select: { publicado: true },
  });
  if (!actual) return res.status(404).json({ error: "Proyecto no encontrado" });

  const { publicado, ...contenido } = parsed.data;
  const cambiaPublicacion = publicado !== undefined && publicado !== actual.publicado;
  if (cambiaPublicacion && publicado) {
    const requisitos = await requisitosDe(userId);
    if (!requisitos.cumple) return res.status(400).json(errorPerfilIncompleto(requisitos));
  }

  // Cambiar solo la publicación no vuelve a revisar el proyecto; editar su contenido sí
  const reiniciar = Object.keys(contenido).length > 0;

  await prisma.$transaction(async (tx) => {
    await tx.proyecto.update({ where: { id }, data: parsed.data });
    if (reiniciar) await reiniciarRevision(tx, id, userId);
    if (cambiaPublicacion) {
      await registrarEvento(tx, { proyectoId: id, evento: publicado ? "PUBLICADO" : "OCULTADO", actorId: userId });
    }
  });

  const proyecto = await prisma.proyecto.findUnique({ where: { id }, select: proyectoSelect });
  res.json(proyecto);
});

proyectosRouter.delete("/:id", async (req: AuthRequest, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const { count } = await prisma.proyecto.deleteMany({
    where: { id, perfil: { userId: req.user!.id } },
  });
  if (count === 0) return res.status(404).json({ error: "Proyecto no encontrado" });
  res.status(204).send();
});

// Vista previa del proyecto: se recibe en memoria y se guarda en Cloudinary (mismas reglas que la foto de perfil)
const uploadImagen = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES_IMAGEN, files: 1 },
});

function recibirImagenProyecto(req: AuthRequest, res: Response, next: (err?: unknown) => void) {
  uploadImagen.single("imagen")(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      const error =
        err.code === "LIMIT_FILE_SIZE" ? "La imagen pesa más de 2 MB" : "No se pudo leer la imagen";
      return res.status(400).json({ error });
    }
    if (err) return next(err);
    next();
  });
}

function requerirCloudinaryProyectos(_req: AuthRequest, res: Response, next: (err?: unknown) => void) {
  if (!cloudinaryConfigurado()) {
    return res.status(503).json({ error: "La subida de imágenes no está configurada" });
  }
  next();
}

/**
 * @openapi
 * /api/v1/proyectos/{id}/imagen:
 *   put:
 *     tags: [Proyectos]
 *     summary: Subir o cambiar la vista previa de mi proyecto
 *     description: >
 *       Imagen en multipart/form-data, campo `imagen` (JPG, PNG o WebP, máximo 2 MB), recortada a 16:9.
 *       Como cambia lo que se ve públicamente, el proyecto vuelve a PENDIENTE, igual que al editar su contenido.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [imagen]
 *             properties:
 *               imagen: { type: string, format: binary }
 *     responses:
 *       200: { description: Proyecto con la nueva imagenUrl }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       404: { description: No existe o no es tuyo }
 *       502: { description: Cloudinary no pudo guardar la imagen }
 *       503: { description: La subida de imágenes no está configurada }
 *   delete:
 *     tags: [Proyectos]
 *     summary: Quitar la vista previa de mi proyecto
 *     description: Igual que al subirla, el proyecto vuelve a PENDIENTE.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Proyecto sin imagen }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       404: { description: No existe o no es tuyo }
 */
proyectosRouter.put(
  "/:id/imagen",
  requerirCloudinaryProyectos,
  recibirImagenProyecto,
  async (req: AuthRequest, res) => {
    const id = parseId(req.params.id, res);
    if (id === null) return;
    if (!req.file) return res.status(400).json({ error: "Envía una imagen en el campo «imagen»" });
    if (!esImagenPermitida(req.file.buffer)) {
      return res.status(400).json({ error: "La imagen debe ser JPG, PNG o WebP" });
    }

    const actual = await prisma.proyecto.findFirst({
      where: { id, perfil: { userId: req.user!.id } },
      select: { id: true, imagenPublicId: true },
    });
    if (!actual) return res.status(404).json({ error: "Proyecto no encontrado" });

    const subida = await subirImagenProyecto(req.file.buffer, id).catch((e) => {
      console.error("No se pudo subir la imagen del proyecto:", e);
      return null;
    });
    if (!subida) return res.status(502).json({ error: "No se pudo guardar la imagen. Intenta de nuevo." });

    await prisma.$transaction(async (tx) => {
      await tx.proyecto.update({
        where: { id },
        data: { imagenUrl: subida.url, imagenPublicId: subida.publicId },
      });
      await reiniciarRevision(tx, id, req.user!.id);
    });

    if (actual.imagenPublicId) {
      await borrarFoto(actual.imagenPublicId).catch((e) =>
        console.error("No se pudo borrar la imagen anterior de Cloudinary:", e),
      );
    }

    const proyecto = await prisma.proyecto.findUnique({ where: { id }, select: proyectoSelect });
    res.json(proyecto);
  },
);

proyectosRouter.delete("/:id/imagen", async (req: AuthRequest, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const actual = await prisma.proyecto.findFirst({
    where: { id, perfil: { userId: req.user!.id } },
    select: { id: true, imagenPublicId: true },
  });
  if (!actual) return res.status(404).json({ error: "Proyecto no encontrado" });

  await prisma.$transaction(async (tx) => {
    await tx.proyecto.update({
      where: { id },
      data: { imagenUrl: null, imagenPublicId: null },
    });
    await reiniciarRevision(tx, id, req.user!.id);
  });

  if (actual.imagenPublicId) {
    await borrarFoto(actual.imagenPublicId).catch((e) =>
      console.error("No se pudo borrar la imagen de Cloudinary:", e),
    );
  }

  const proyecto = await prisma.proyecto.findUnique({ where: { id }, select: proyectoSelect });
  res.json(proyecto);
});

