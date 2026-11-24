import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth";
import { validationError } from "../lib/validation";
import { DIAS_PLAZO_POR_DEFECTO, registrarEvento } from "../lib/historial";

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
    // Días que tiene el estudiante para corregir un proyecto rechazado
    plazoDias: z.coerce.number().int().min(1).max(60).optional(),
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
  destacado: true,
  publicado: true,
  fechaLimiteCorreccion: true,
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
 * /api/v1/validaciones/validados:
 *   get:
 *     tags: [Validaciones]
 *     summary: Proyectos ya validados, con los datos de su estudiante
 *     description: Solo COORDINACION. Del más reciente al más antiguo según su validación.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de proyectos VALIDADOS con los datos del autor y la validación
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Proyecto' }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 */
validacionesRouter.get("/validados", async (_req, res) => {
  const proyectos = await prisma.proyecto.findMany({
    where: { estadoValidacion: "VALIDADO" },
    orderBy: { updatedAt: "desc" },
    select: { ...proyectoSelect, perfil: { select: autorSelect } },
  });
  res.json(proyectos.map(({ perfil, ...p }) => ({ ...p, estudiante: armarAutor(perfil) })));
});

/**
 * @openapi
 * /api/v1/validaciones/rechazados:
 *   get:
 *     tags: [Validaciones]
 *     summary: Proyectos rechazados que esperan corrección
 *     description: >
 *       Solo COORDINACION. Ordenados por fecha límite (la más próxima primero).
 *       `vencido` indica que el plazo de corrección ya pasó sin que el estudiante enviara cambios.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de proyectos RECHAZADOS con su fecha límite y los datos del autor }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 */
validacionesRouter.get("/rechazados", async (_req, res) => {
  const proyectos = await prisma.proyecto.findMany({
    where: { estadoValidacion: "RECHAZADO" },
    orderBy: [{ fechaLimiteCorreccion: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
    select: { ...proyectoSelect, perfil: { select: autorSelect } },
  });
  const ahora = Date.now();
  res.json(
    proyectos.map(({ perfil, ...p }) => ({
      ...p,
      vencido: Boolean(p.fechaLimiteCorreccion && p.fechaLimiteCorreccion.getTime() < ahora),
      estudiante: armarAutor(perfil),
    })),
  );
});

/**
 * @openapi
 * /api/v1/validaciones/proyectos/{id}/historial:
 *   get:
 *     tags: [Validaciones]
 *     summary: Línea de tiempo de un proyecto
 *     description: >
 *       Solo COORDINACION. Eventos del más antiguo al más reciente: CREADO, EDITADO, CORREGIDO,
 *       VALIDADO, RECHAZADO (con fecha límite), PUBLICADO y OCULTADO.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer, minimum: 1 } }
 *     responses:
 *       200:
 *         description: Eventos del proyecto
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: integer }
 *                   evento: { type: string, enum: [CREADO, EDITADO, CORREGIDO, VALIDADO, RECHAZADO, PUBLICADO, OCULTADO] }
 *                   comentario: { type: string, nullable: true }
 *                   fechaLimite: { type: string, format: date-time, nullable: true }
 *                   fueraDePlazo: { type: boolean }
 *                   createdAt: { type: string, format: date-time }
 *                   actor:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       id: { type: integer }
 *                       nombre: { type: string }
 *                       rol: { type: string }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       404: { description: Proyecto no encontrado }
 */
validacionesRouter.get("/proyectos/:id/historial", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "El id debe ser un entero positivo" });

  const existe = await prisma.proyecto.findUnique({ where: { id: id.data }, select: { id: true } });
  if (!existe) return res.status(404).json({ error: "Proyecto no encontrado" });

  const eventos = await prisma.historialProyecto.findMany({
    where: { proyectoId: id.data },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      evento: true,
      comentario: true,
      fechaLimite: true,
      fueraDePlazo: true,
      createdAt: true,
      actor: { select: { id: true, nombre: true, rol: true } },
    },
  });
  res.json(eventos);
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
        perfil: { select: { carnet: true, fotoUrl: true, porcentajeAvance: true } },
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
      fotoUrl: perfil?.fotoUrl ?? null,
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
          fotoUrl: true,
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
      fotoUrl: null,
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
 *               plazoDias: { type: integer, minimum: 1, maximum: 60, default: 7, description: "Solo al rechazar: días que tiene el estudiante para corregir" }
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
  const { estado, comentario, plazoDias } = parsed.data;
  const proyectoId = id.data;
  const coordinadorId = req.user!.id;

  // Al rechazar, el estudiante tiene un plazo para corregir (7 días si no se indica otro)
  const fechaLimite =
    estado === "RECHAZADO"
      ? new Date(Date.now() + (plazoDias ?? DIAS_PLAZO_POR_DEFECTO) * 24 * 60 * 60 * 1000)
      : null;

  const resultado = await prisma.$transaction(async (tx) => {
    // El filtro estadoValidacion = PENDIENTE evita que dos coordinadores evalúen a la vez
    const { count } = await tx.proyecto.updateMany({
      where: { id: proyectoId, estadoValidacion: "PENDIENTE" },
      data: { estadoValidacion: estado, fechaLimiteCorreccion: fechaLimite },
    });
    if (count === 0) return null;

    await tx.validacionProyecto.upsert({
      where: { proyectoId },
      create: { proyectoId, coordinadorId, comentario: comentario ?? null },
      update: { coordinadorId, comentario: comentario ?? null },
    });
    await registrarEvento(tx, {
      proyectoId,
      evento: estado,
      actorId: coordinadorId,
      comentario: comentario ?? null,
      fechaLimite,
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

/**
 * @openapi
 * /api/v1/validaciones/proyectos/{id}/destacado:
 *   put:
 *     tags: [Validaciones]
 *     summary: Marcar o quitar un proyecto como destacado
 *     description: >
 *       Solo COORDINACION. Para destacar, el proyecto debe estar VALIDADO y publicado por su estudiante.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer, minimum: 1 } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [destacado]
 *             properties:
 *               destacado: { type: boolean }
 *     responses:
 *       200: { description: Proyecto actualizado }
 *       400: { description: El proyecto no está validado y publicado, o datos inválidos }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       404: { description: Proyecto no encontrado }
 */
validacionesRouter.put("/proyectos/:id/destacado", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "El id debe ser un entero positivo" });
  const parsed = z.object({ destacado: z.boolean() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationError(parsed.error));

  const actual = await prisma.proyecto.findUnique({ where: { id: id.data }, select: { estadoValidacion: true, publicado: true } });
  if (!actual) return res.status(404).json({ error: "Proyecto no encontrado" });
  if (parsed.data.destacado && (actual.estadoValidacion !== "VALIDADO" || !actual.publicado)) {
    return res.status(400).json({ error: "Solo se pueden destacar proyectos validados y publicados por su estudiante" });
  }

  const proyecto = await prisma.proyecto.update({
    where: { id: id.data },
    data: { destacado: parsed.data.destacado },
    select: proyectoSelect,
  });
  res.json(proyecto);
});
