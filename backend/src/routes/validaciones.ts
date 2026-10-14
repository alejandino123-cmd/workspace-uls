import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth";
import { validationError } from "../lib/validation";

export const validacionesRouter = Router();
validacionesRouter.use(requireAuth, requireRole("DOCENTE"));

const idSchema = z.coerce.number().int().positive();

const evaluarSchema = z
  .object({
    estado: z.enum(["VALIDADO", "RECHAZADO"]),
    comentario: z.string().trim().min(1).max(1000).optional(),
  })
  .refine((d) => d.estado === "VALIDADO" || d.comentario, {
    message: "Al rechazar un proyecto debes explicar el motivo",
    path: ["comentario"],
  });

const proyectoSelect = {
  id: true,
  titulo: true,
  descripcion: true,
  urlRepositorio: true,
  urlDemo: true,
  urlDocumentacion: true,
  tecnologias: true,
  estadoValidacion: true,
  updatedAt: true,
  validacion: { select: { comentario: true, createdAt: true } },
  createdAt: true,
} as const;

/**
 * @openapi
 * /api/v1/validaciones/pendientes:
 *   get:
 *     tags: [Validaciones]
 *     summary: Proyectos pendientes de validar
 *     description: Solo DOCENTE. Del más antiguo al más reciente.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de proyectos en estado PENDIENTE con los datos de su autor
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Proyecto'
 *                   - type: object
 *                     properties:
 *                       estudiante:
 *                         type: object
 *                         properties:
 *                           id: { type: integer }
 *                           nombre: { type: string }
 *                           email: { type: string }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 */
validacionesRouter.get("/pendientes", async (_req, res) => {
  const proyectos = await prisma.proyecto.findMany({
    where: { estadoValidacion: "PENDIENTE" },
    orderBy: { createdAt: "asc" },
    select: {
      ...proyectoSelect,
      perfil: { select: { user: { select: { id: true, nombre: true, email: true } } } },
    },
  });
  res.json(proyectos.map(({ perfil, ...p }) => ({ ...p, estudiante: perfil.user })));
});

/**
 * @openapi
 * /api/v1/validaciones/{proyectoId}:
 *   post:
 *     tags: [Validaciones]
 *     summary: Validar o rechazar un proyecto
 *     description: Solo proyectos en PENDIENTE. Rechazar exige comentario.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: proyectoId, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estado]
 *             properties:
 *               estado: { type: string, enum: [VALIDADO, RECHAZADO] }
 *               comentario: { type: string, example: "Falta documentación del repositorio." }
 *     responses:
 *       200:
 *         description: Proyecto evaluado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Proyecto' }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       404: { description: El proyecto no existe }
 *       409: { description: El proyecto ya fue evaluado }
 */
validacionesRouter.post("/:proyectoId", async (req: AuthRequest, res) => {
  const id = idSchema.safeParse(req.params.proyectoId);
  if (!id.success) return res.status(400).json({ error: "El id debe ser un entero positivo" });
  const parsed = evaluarSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationError(parsed.error));
  const { estado, comentario } = parsed.data;
  const proyectoId = id.data;
  const docenteId = req.user!.id;

  const resultado = await prisma.$transaction(async (tx) => {
    // El filtro estadoValidacion = PENDIENTE evita que dos docentes evalúen a la vez
    const { count } = await tx.proyecto.updateMany({
      where: { id: proyectoId, estadoValidacion: "PENDIENTE" },
      data: { estadoValidacion: estado },
    });
    if (count === 0) return null;

    await tx.validacionDocente.upsert({
      where: { proyectoId },
      create: { proyectoId, docenteId, comentario: comentario ?? null },
      update: { docenteId, comentario: comentario ?? null },
    });
    return tx.proyecto.findUnique({ where: { id: proyectoId }, select: proyectoSelect });
  });

  if (resultado) return res.json(resultado);

  const existe = await prisma.proyecto.findUnique({ where: { id: proyectoId }, select: { id: true } });
  if (!existe) return res.status(404).json({ error: "Proyecto no encontrado" });
  res.status(409).json({ error: "El proyecto ya fue evaluado" });
});

const detalleSelect = {
  ...proyectoSelect,
  validacion: { select: { comentario: true, createdAt: true } },
} as const;

/**
 * @openapi
 * /api/v1/validaciones/proyectos/{id}:
 *   get:
 *     tags: [Validaciones]
 *     summary: Ver el detalle de cualquier proyecto (docente)
 *     description: Devuelve el proyecto con su estado de validación y los datos del estudiante dueño.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: Proyecto con datos del estudiante
 *       400:
 *         $ref: '#/components/responses/DatosInvalidos'
 *       401:
 *         $ref: '#/components/responses/NoAutenticado'
 *       403:
 *         $ref: '#/components/responses/SinPermiso'
 *       404:
 *         description: Proyecto no encontrado
 */
validacionesRouter.get("/proyectos/:id", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ error: "El id debe ser un entero positivo" });
  }

  const p = await prisma.proyecto.findUnique({
    where: { id: id.data },
    select: {
      ...detalleSelect,
      perfil: {
        select: { user: { select: { id: true, nombre: true, email: true } } },
      },
    },
  });
  if (!p) return res.status(404).json({ error: "Proyecto no encontrado" });

  const { perfil, ...resto } = p;
  res.json({ ...resto, estudiante: perfil.user });
});

/**
 * @openapi
 * /api/v1/validaciones/estudiantes/{userId}/proyectos:
 *   get:
 *     tags: [Validaciones]
 *     summary: Ver el portafolio completo de un estudiante (docente)
 *     description: Devuelve todos los proyectos del estudiante, sin importar su estado de validación.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: Estudiante y lista de proyectos
 *       400:
 *         $ref: '#/components/responses/DatosInvalidos'
 *       401:
 *         $ref: '#/components/responses/NoAutenticado'
 *       403:
 *         $ref: '#/components/responses/SinPermiso'
 *       404:
 *         description: Estudiante no encontrado
 */
validacionesRouter.get("/estudiantes/:userId/proyectos", async (req, res) => {
  const id = idSchema.safeParse(req.params.userId);
  if (!id.success) {
    return res.status(400).json({ error: "El id debe ser un entero positivo" });
  }

  const estudiante = await prisma.user.findFirst({
    where: { id: id.data, rol: "ESTUDIANTE" },
    select: { id: true, nombre: true, email: true, rol: true },
  });
  if (!estudiante) {
    return res.status(404).json({ error: "Estudiante no encontrado" });
  }

  const proyectos = await prisma.proyecto.findMany({
    where: { perfil: { userId: id.data } },
    orderBy: { createdAt: "desc" },
    select: detalleSelect,
  });
  res.json({ estudiante, proyectos });
});