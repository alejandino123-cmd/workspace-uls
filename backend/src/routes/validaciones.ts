import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth";
import { validationError } from "../lib/validation";

export const validacionesRouter = Router();
validacionesRouter.use(requireAuth, requireRole("COORDINACION"));

const idSchema = z.coerce.number().int().positive();

const buscarSchema = z.object({
  buscar: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

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

// Datos del autor de un proyecto (los ve solo Coordinación)
const autorSelect = {
  carnet: true,
  user: { select: { id: true, nombre: true, email: true } },
} as const;

function armarAutor(p: {
  carnet: string | null;
  user: { id: number; nombre: string; email: string };
}) {
  return { ...p.user, carnet: p.carnet };
}

/**
 * @openapi
 * /api/v1/validaciones/pendientes:
 *   get:
 *     tags: [Validaciones]
 *     summary: Proyectos pendientes de validar
 *     description: Solo COORDINACION. Del más antiguo al más reciente.
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
 *                           carnet: { type: string, nullable: true }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 */
validacionesRouter.get("/pendientes", async (_req, res) => {
  const proyectos = await prisma.proyecto.findMany({
    where: { estadoValidacion: "PENDIENTE" },
    orderBy: { createdAt: "asc" },
    select: { ...proyectoSelect, perfil: { select: autorSelect } },
  });
  res.json(proyectos.map(({ perfil, ...p }) => ({ ...p, estudiante: armarAutor(perfil) })));
});

/**
 * @openapi
 * /api/v1/validaciones/estudiantes:
 *   get:
 *     tags: [Validaciones]
 *     summary: Buscar estudiantes por carnet, nombre o correo
 *     description: >
 *       Solo COORDINACION. El carnet se busca por coincidencia exacta; nombre y correo
 *       por coincidencia parcial sin distinguir mayúsculas. Sin `buscar` lista a todos.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: buscar, schema: { type: string }, description: Carnet, nombre o correo }
 *       - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 50, default: 20 } }
 *     responses:
 *       200:
 *         description: Página de estudiantes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total: { type: integer }
 *                 page: { type: integer }
 *                 limit: { type: integer }
 *                 estudiantes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer }
 *                       nombre: { type: string }
 *                       email: { type: string }
 *                       carnet: { type: string, nullable: true }
 *                       porcentajeAvance: { type: integer }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 */
validacionesRouter.get("/estudiantes", async (req, res) => {
  const parsed = buscarSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json(validationError(parsed.error));
  const { buscar, page, limit } = parsed.data;

  const where = {
    rol: "ESTUDIANTE" as const,
    ...(buscar
      ? {
          OR: [
            { nombre: { contains: buscar, mode: "insensitive" as const } },
            { email: { contains: buscar, mode: "insensitive" as const } },
            { perfil: { is: { carnet: buscar.toUpperCase() } } },
          ],
        }
      : {}),
  };

  const [total, filas] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { nombre: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        nombre: true,
        email: true,
        perfil: { select: { carnet: true, porcentajeAvance: true } },
      },
    }),
  ]);

  res.json({
    total,
    page,
    limit,
    estudiantes: filas.map(({ perfil, ...u }) => ({
      ...u,
      carnet: perfil?.carnet ?? null,
      porcentajeAvance: perfil?.porcentajeAvance ?? 0,
    })),
  });
});

/**
 * @openapi
 * /api/v1/validaciones/estudiantes/{userId}:
 *   get:
 *     tags: [Validaciones]
 *     summary: Perfil completo de un estudiante
 *     description: >
 *       Solo COORDINACION, solo lectura. Incluye correo, carnet, historial académico y
 *       el conteo de proyectos por estado. Los proyectos se consultan en
 *       `/estudiantes/{userId}/proyectos`.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: userId, required: true, schema: { type: integer, minimum: 1 } }
 *     responses:
 *       200:
 *         description: Perfil completo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 estudiante:
 *                   type: object
 *                   properties:
 *                     id: { type: integer }
 *                     nombre: { type: string }
 *                     email: { type: string }
 *                     createdAt: { type: string, format: date-time }
 *                 perfil:
 *                   type: object
 *                   properties:
 *                     carnet: { type: string, nullable: true }
 *                     porcentajeAvance: { type: integer }
 *                     historialAcademico: { type: string, nullable: true }
 *                     disponibilidad: { type: string, nullable: true }
 *                     habilidades: { type: array, items: { type: string } }
 *                 proyectos:
 *                   type: object
 *                   properties:
 *                     PENDIENTE: { type: integer }
 *                     VALIDADO: { type: integer }
 *                     RECHAZADO: { type: integer }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       404: { description: Estudiante no encontrado }
 */
validacionesRouter.get("/estudiantes/:userId", async (req, res) => {
  const id = idSchema.safeParse(req.params.userId);
  if (!id.success) return res.status(400).json({ error: "El id debe ser un entero positivo" });

  const u = await prisma.user.findFirst({
    where: { id: id.data, rol: "ESTUDIANTE" },
    select: {
      id: true,
      nombre: true,
      email: true,
      createdAt: true,
      perfil: {
        select: {
          carnet: true,
          porcentajeAvance: true,
          historialAcademico: true,
          disponibilidad: true,
          habilidades: true,
        },
      },
    },
  });
  if (!u) return res.status(404).json({ error: "Estudiante no encontrado" });

  const grupos = await prisma.proyecto.groupBy({
    by: ["estadoValidacion"],
    where: { perfil: { userId: id.data } },
    _count: { _all: true },
  });
  const proyectos = { PENDIENTE: 0, VALIDADO: 0, RECHAZADO: 0 };
  for (const g of grupos) proyectos[g.estadoValidacion] = g._count._all;

  const { perfil, ...estudiante } = u;
  res.json({
    estudiante,
    perfil: perfil ?? {
      carnet: null,
      porcentajeAvance: 0,
      historialAcademico: null,
      disponibilidad: null,
      habilidades: [],
    },
    proyectos,
  });
});

/**
 * @openapi
 * /api/v1/validaciones/{proyectoId}:
 *   post:
 *     tags: [Validaciones]
 *     summary: Validar o rechazar un proyecto
 *     description: Solo COORDINACION. Solo proyectos en PENDIENTE. Rechazar exige comentario.
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
  const coordinadorId = req.user!.id;

  const resultado = await prisma.$transaction(async (tx) => {
    // El filtro estadoValidacion = PENDIENTE evita que dos coordinadores evalúen a la vez
    const { count } = await tx.proyecto.updateMany({
      where: { id: proyectoId, estadoValidacion: "PENDIENTE" },
      data: { estadoValidacion: estado },
    });
    if (count === 0) return null;

    await tx.validacionProyecto.upsert({
      where: { proyectoId },
      create: { proyectoId, coordinadorId, comentario: comentario ?? null },
      update: { coordinadorId, comentario: comentario ?? null },
    });
    return tx.proyecto.findUnique({ where: { id: proyectoId }, select: proyectoSelect });
  });

  if (resultado) return res.json(resultado);

  const existe = await prisma.proyecto.findUnique({ where: { id: proyectoId }, select: { id: true } });
  if (!existe) return res.status(404).json({ error: "Proyecto no encontrado" });
  res.status(409).json({ error: "El proyecto ya fue evaluado" });
});

/**
 * @openapi
 * /api/v1/validaciones/proyectos/{id}:
 *   get:
 *     tags: [Validaciones]
 *     summary: Ver el detalle de cualquier proyecto
 *     description: Solo COORDINACION. Devuelve el proyecto con su validación y los datos del estudiante dueño (incluye carnet).
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer, minimum: 1 } }
 *     responses:
 *       200: { description: Proyecto con datos del estudiante }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       404: { description: Proyecto no encontrado }
 */
validacionesRouter.get("/proyectos/:id", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "El id debe ser un entero positivo" });

  const p = await prisma.proyecto.findUnique({
    where: { id: id.data },
    select: { ...proyectoSelect, perfil: { select: autorSelect } },
  });
  if (!p) return res.status(404).json({ error: "Proyecto no encontrado" });

  const { perfil, ...resto } = p;
  res.json({ ...resto, estudiante: armarAutor(perfil) });
});

/**
 * @openapi
 * /api/v1/validaciones/estudiantes/{userId}/proyectos:
 *   get:
 *     tags: [Validaciones]
 *     summary: Ver el portafolio completo de un estudiante
 *     description: Solo COORDINACION. Todos los proyectos del estudiante, sin importar su estado.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: userId, required: true, schema: { type: integer, minimum: 1 } }
 *     responses:
 *       200: { description: Estudiante y lista de proyectos }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       404: { description: Estudiante no encontrado }
 */
validacionesRouter.get("/estudiantes/:userId/proyectos", async (req, res) => {
  const id = idSchema.safeParse(req.params.userId);
  if (!id.success) return res.status(400).json({ error: "El id debe ser un entero positivo" });

  const u = await prisma.user.findFirst({
    where: { id: id.data, rol: "ESTUDIANTE" },
    select: { id: true, nombre: true, email: true, rol: true, perfil: { select: { carnet: true } } },
  });
  if (!u) return res.status(404).json({ error: "Estudiante no encontrado" });

  const proyectos = await prisma.proyecto.findMany({
    where: { perfil: { userId: id.data } },
    orderBy: { createdAt: "desc" },
    select: proyectoSelect,
  });

  const { perfil, ...resto } = u;
  res.json({ estudiante: { ...resto, carnet: perfil?.carnet ?? null }, proyectos });
});