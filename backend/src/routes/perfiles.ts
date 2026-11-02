import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export const perfilesRouter = Router();

const idSchema = z.coerce.number().int().positive();

const listaSchema = z.object({
  buscar: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// Un proyecto es público solo si Coordinación lo validó y el estudiante lo publicó
const PUBLICO = { estadoValidacion: "VALIDADO" as const, publicado: true };

/**
 * @openapi
 * /api/v1/perfiles:
 *   get:
 *     tags: [Perfiles públicos]
 *     summary: Listar portafolios públicos
 *     description: >
 *       No requiere sesión. Lista los estudiantes que tienen al menos un proyecto VALIDADO
 *       y publicado. Sin correo, carnet ni historial académico.
 *     parameters:
 *       - { in: query, name: buscar, schema: { type: string }, description: Parte del nombre }
 *       - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 50, default: 20 } }
 *     responses:
 *       200:
 *         description: Página de portafolios
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
 *                       porcentajeAvance: { type: integer }
 *                       disponibilidad: { type: string, nullable: true }
 *                       habilidades: { type: array, items: { type: string } }
 *                       totalProyectos: { type: integer }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 */
perfilesRouter.get("/", async (req, res) => {
  const parsed = listaSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos" });
  const { buscar, page, limit } = parsed.data;

  const where = {
    rol: "ESTUDIANTE" as const,
    perfil: { is: { proyectos: { some: PUBLICO } } },
    ...(buscar ? { nombre: { contains: buscar, mode: "insensitive" as const } } : {}),
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
        fotoArchivo: true,
        perfil: {
          select: {
            porcentajeAvance: true,
            disponibilidad: true,
            habilidades: true,
            _count: { select: { proyectos: { where: PUBLICO } } },
          },
        },
      },
    }),
  ]);

  res.json({
    total,
    page,
    limit,
    estudiantes: filas.map(({ perfil, ...u }) => ({
      id: u.id,
      nombre: u.nombre,
      fotoUrl: u.fotoArchivo ? `/api/v1/fotos/${u.id}` : null,
      porcentajeAvance: perfil?.porcentajeAvance ?? 0,
      disponibilidad: perfil?.disponibilidad ?? null,
      habilidades: perfil?.habilidades ?? [],
      totalProyectos: perfil?._count.proyectos ?? 0,
    })),
  });
});

/**
 * @openapi
 * /api/v1/perfiles/{userId}:
 *   get:
 *     tags: [Perfiles públicos]
 *     summary: Ver el portafolio público de un estudiante
 *     description: >
 *       No requiere sesión. Solo muestra habilidades, avance, disponibilidad y los
 *       proyectos VALIDADOS que el estudiante publicó. Nunca incluye correo, carnet
 *       ni historial académico.
 *     parameters:
 *       - { in: path, name: userId, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: Portafolio público
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
 *                 perfil:
 *                   type: object
 *                   properties:
 *                     porcentajeAvance: { type: integer }
 *                     disponibilidad: { type: string, nullable: true }
 *                     habilidades: { type: array, items: { type: string } }
 *                 proyectos:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Proyecto' }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       404:
 *         description: El estudiante no existe
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
perfilesRouter.get("/:userId", async (req, res) => {
  const id = idSchema.safeParse(req.params.userId);
  if (!id.success) return res.status(400).json({ error: "El id debe ser un entero positivo" });

  const user = await prisma.user.findFirst({
    where: { id: id.data, rol: "ESTUDIANTE" },
    select: {
      id: true,
      nombre: true,
      fotoArchivo: true,
      perfil: {
        select: {
          porcentajeAvance: true,
          disponibilidad: true,
          habilidades: true,
          proyectos: {
            where: PUBLICO,
            orderBy: { updatedAt: "desc" },
            select: {
              id: true,
              titulo: true,
              descripcion: true,
              urlRepositorio: true,
              urlDemo: true,
              urlDocumentacion: true,
              tecnologias: true,
              estadoValidacion: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });
  if (!user) return res.status(404).json({ error: "Estudiante no encontrado" });

  const perfil = user.perfil;
  res.json({
    estudiante: {
      id: user.id,
      nombre: user.nombre,
      fotoUrl: user.fotoArchivo ? `/api/v1/fotos/${user.id}` : null,
    },
    perfil: {
      porcentajeAvance: perfil?.porcentajeAvance ?? 0,
      disponibilidad: perfil?.disponibilidad ?? null,
      habilidades: perfil?.habilidades ?? [],
    },
    proyectos: perfil?.proyectos ?? [],
  });
});
