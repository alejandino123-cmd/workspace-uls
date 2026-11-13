import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export const perfilesRouter = Router();

const idSchema = z.coerce.number().int().positive();

const listaSchema = z.object({
  buscar: z.string().trim().min(1).max(100).optional(),
  habilidad: z.string().trim().min(1).max(40).optional(),
  tecnologia: z.string().trim().min(1).max(40).optional(),
  disponibilidad: z.enum(["TIEMPO_COMPLETO", "TIEMPO_PARCIAL", "SOLO_PROYECTOS"]).optional(),
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
  const { buscar, habilidad, tecnologia, disponibilidad, page, limit } = parsed.data;

  // La tecnología debe estar en un mismo proyecto público; la habilidad y la disponibilidad van en el perfil
  const proyectoFiltro = { ...PUBLICO, ...(tecnologia ? { tecnologias: { has: tecnologia } } : {}) };
  const perfilFiltro = {
    proyectos: { some: proyectoFiltro },
    ...(habilidad ? { habilidades: { has: habilidad } } : {}),
    ...(disponibilidad ? { disponibilidad } : {}),
  };

  // El buscador coincide con el nombre o con una habilidad exacta
  const where = {
    rol: "ESTUDIANTE" as const,
    perfil: { is: perfilFiltro },
    ...(buscar
      ? {
          OR: [
            { nombre: { contains: buscar, mode: "insensitive" as const } },
            { perfil: { is: { habilidades: { has: buscar } } } },
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
        perfil: {
          
          select: {
            fotoUrl:true,
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
      fotoUrl: perfil?.fotoUrl ?? null,
      porcentajeAvance: perfil?.porcentajeAvance ?? 0,
      disponibilidad: perfil?.disponibilidad ?? null,
      habilidades: perfil?.habilidades ?? [],
      totalProyectos: perfil?._count.proyectos ?? 0,
    })),
  });
});

/**
 * @openapi
 * /api/v1/perfiles/filtros:
 *   get:
 *     tags: [Perfiles públicos]
 *     summary: Valores disponibles para los filtros del portafolio público
 *     description: No requiere sesión. Habilidades y tecnologías de los estudiantes con portafolio público.
 *     responses:
 *       200:
 *         description: Listas para llenar los filtros
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 habilidades: { type: array, items: { type: string } }
 *                 tecnologias: { type: array, items: { type: string } }
 *                 disponibilidades: { type: array, items: { type: string } }
 */
perfilesRouter.get("/filtros", async (_req, res) => {
  const perfiles = await prisma.perfilEstudiante.findMany({
    where: { user: { rol: "ESTUDIANTE" }, proyectos: { some: PUBLICO } },
    select: {
      habilidades: true,
      proyectos: { where: PUBLICO, select: { tecnologias: true } },
    },
  });

  const habilidades = new Set<string>();
  const tecnologias = new Set<string>();
  for (const perfil of perfiles) {
    perfil.habilidades.forEach((h) => habilidades.add(h));
    perfil.proyectos.forEach((p) => p.tecnologias.forEach((t) => tecnologias.add(t)));
  }

  res.json({
    habilidades: [...habilidades].sort((a, b) => a.localeCompare(b, "es")),
    tecnologias: [...tecnologias].sort((a, b) => a.localeCompare(b, "es")),
    disponibilidades: ["TIEMPO_COMPLETO", "TIEMPO_PARCIAL", "SOLO_PROYECTOS"],
  });
});

/**
 * @openapi
 * /api/v1/perfiles/destacados:
 *   get:
 *     tags: [Perfiles públicos]
 *     summary: Proyectos destacados por Coordinación
 *     description: No requiere sesión. Solo proyectos VALIDADOS, publicados por su estudiante y marcados como destacados.
 *     responses:
 *       200:
 *         description: Hasta 6 proyectos destacados, del más reciente al más antiguo
 */
perfilesRouter.get("/destacados", async (_req, res) => {
  const proyectos = await prisma.proyecto.findMany({
    where: { ...PUBLICO, destacado: true },
    orderBy: { updatedAt: "desc" },
    take: 6,
    select: {
      id: true,
      titulo: true,
      descripcion: true,
      tecnologias: true,
      imagenUrl: true,
      urlRepositorio: true,
      urlDemo: true,
      urlDocumentacion: true,
      createdAt: true,
      updatedAt: true,
      perfil: {
        select: { fotoUrl: true, user: { select: { id: true, nombre: true } } },
      },
    },
  });

  res.json(
    proyectos.map(({ perfil, ...p }) => ({
      ...p,
      estudiante: { id: perfil.user.id, nombre: perfil.user.nombre, fotoUrl: perfil.fotoUrl },
    })),
  );
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
      perfil: {
        select: {
          fotoUrl:true,
          porcentajeAvance: true,
          disponibilidad: true,
          habilidades: true,
          // Presentación y enlaces profesionales (nunca teléfono, ubicación, carnet ni historial)
          especialidad: true,
          biografia: true,
          github: true,
          linkedin: true,
          sitioWeb: true,
          cvUrl: true,
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
              imagenUrl: true,
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
const fotoUrl = perfil?.fotoUrl ?? null;
res.json({
  estudiante: { id: user.id, nombre: user.nombre, fotoUrl },
  perfil: {
    porcentajeAvance: perfil?.porcentajeAvance ?? 0,
    disponibilidad: perfil?.disponibilidad ?? null,
    habilidades: perfil?.habilidades ?? [],
    fotoUrl,
    especialidad: perfil?.especialidad ?? null,
    biografia: perfil?.biografia ?? null,
    github: perfil?.github ?? null,
    linkedin: perfil?.linkedin ?? null,
    sitioWeb: perfil?.sitioWeb ?? null,
    cvUrl: perfil?.cvUrl ?? null,
  },
  proyectos: perfil?.proyectos ?? [],
}); 
});
