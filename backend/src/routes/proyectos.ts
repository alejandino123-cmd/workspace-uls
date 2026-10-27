import { Router, type Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth";
import { etiquetasSchema, validationError } from "../lib/validation";

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
  estadoValidacion: true,
  publicado: true,
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
 *               publicado: { type: boolean, default: false, description: Si aparece en el portafolio público (requiere estar VALIDADO) }
 *     responses:
 *       201:
 *         description: Proyecto creado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Proyecto' }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
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

  const proyecto = await prisma.proyecto.create({
    data: { perfilId: perfil.id, ...parsed.data },
    select: proyectoSelect,
  });

  res.status(201).json(proyecto);
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
 *     description: Solo se cambian los campos enviados. Al editar, el estado vuelve a PENDIENTE.
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

  // Cambiar solo la publicación no vuelve a revisar el proyecto; editar su contenido sí
  const reiniciarValidacion = Object.keys(parsed.data).some((campo) => campo !== "publicado");

  // updateMany permite filtrar por dueño en la misma consulta
  const count = await prisma.$transaction(async (tx) => {
    const { count } = await tx.proyecto.updateMany({
      where: { id, perfil: { userId: req.user!.id } },
      data: {
        ...parsed.data,
        ...(reiniciarValidacion ? { estadoValidacion: "PENDIENTE" as const } : {}),
      },
    });
    if (count > 0 && reiniciarValidacion) {
      await tx.validacionProyecto.deleteMany({ where: { proyectoId: id } });
    }
    return count;
  });
  if (count === 0) return res.status(404).json({ error: "Proyecto no encontrado" });

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