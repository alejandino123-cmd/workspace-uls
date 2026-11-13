import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

// Catálogo público de proyectos. No requiere sesión.
// Va en /catalogo y no en /proyectos porque /proyectos exige sesión de estudiante.
export const catalogoRouter = Router();

// Un proyecto es público solo si Coordinación lo validó y el estudiante lo publicó
const PUBLICO = { estadoValidacion: "VALIDADO" as const, publicado: true };

const idSchema = z.coerce.number().int().positive();

const listaSchema = z.object({
  buscar: z.string().trim().min(1).max(100).optional(),
  tecnologia: z.string().trim().min(1).max(40).optional(),
  anio: z.coerce.number().int().min(2000).max(2100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

// Año de publicación: se usa la fecha de creación del proyecto (no hay campo de año académico todavía)
function rangoAnio(anio: number) {
  return {
    gte: new Date(Date.UTC(anio, 0, 1)),
    lt: new Date(Date.UTC(anio + 1, 0, 1)),
  };
}

const proyectoResumen = {
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
    select: {
      fotoUrl: true,
      user: { select: { id: true, nombre: true } },
    },
  },
} as const;

// Aplana la estructura de Prisma a lo que el frontend necesita
function aResumen({ perfil, ...p }: {
  id: number; titulo: string; descripcion: string; tecnologias: string[];
  urlRepositorio: string | null; urlDemo: string | null; urlDocumentacion: string | null;
  createdAt: Date; updatedAt: Date;
  perfil: { fotoUrl: string | null; user: { id: number; nombre: string } };
}) {
  return {
    ...p,
    estudiante: { id: perfil.user.id, nombre: perfil.user.nombre, fotoUrl: perfil.fotoUrl },
  };
}

/**
 * @openapi
 * /api/v1/catalogo/proyectos:
 *   get:
 *     tags: [Catálogo público]
 *     summary: Buscar proyectos publicados
 *     description: >
 *       No requiere sesión. Solo proyectos VALIDADOS y publicados por su estudiante.
 *       Ordenados del más reciente al más antiguo.
 *     parameters:
 *       - { in: query, name: buscar, schema: { type: string }, description: Texto en el título o la descripción, o tecnología exacta }
 *       - { in: query, name: tecnologia, schema: { type: string } }
 *       - { in: query, name: anio, schema: { type: integer }, description: Año de publicación }
 *       - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 50, default: 12 } }
 *     responses:
 *       200:
 *         description: Página de proyectos
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 */
catalogoRouter.get("/proyectos", async (req, res) => {
  const parsed = listaSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos" });
  const { buscar, tecnologia, anio, page, limit } = parsed.data;

  const where = {
    ...PUBLICO,
    ...(buscar
      ? {
          OR: [
            { titulo: { contains: buscar, mode: "insensitive" as const } },
            { descripcion: { contains: buscar, mode: "insensitive" as const } },
            { tecnologias: { has: buscar } },
          ],
        }
      : {}),
    ...(tecnologia ? { tecnologias: { has: tecnologia } } : {}),
    ...(anio ? { createdAt: rangoAnio(anio) } : {}),
  };

  const [total, filas] = await prisma.$transaction([
    prisma.proyecto.count({ where }),
    prisma.proyecto.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: proyectoResumen,
    }),
  ]);

  res.json({ total, page, limit, proyectos: filas.map(aResumen) });
});

/**
 * @openapi
 * /api/v1/catalogo/proyectos/{id}:
 *   get:
 *     tags: [Catálogo público]
 *     summary: Detalle de un proyecto publicado
 *     description: No requiere sesión. Responde 404 si el proyecto no está validado y publicado.
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Proyecto }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       404: { description: No existe o no está publicado }
 */
catalogoRouter.get("/proyectos/:id", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "El id debe ser un entero positivo" });

  const proyecto = await prisma.proyecto.findFirst({
    where: { id: id.data, ...PUBLICO },
    select: {
      ...proyectoResumen,
      perfil: {
        select: {
          fotoUrl: true,
          especialidad: true,
          biografia: true,
          github: true,
          linkedin: true,
          sitioWeb: true,
          user: { select: { id: true, nombre: true } },
        },
      },
    },
  });
  if (!proyecto) return res.status(404).json({ error: "Proyecto no encontrado" });

  const { perfil, ...p } = proyecto;
  res.json({
    ...p,
    estudiante: {
      id: perfil.user.id,
      nombre: perfil.user.nombre,
      fotoUrl: perfil.fotoUrl,
      especialidad: perfil.especialidad,
      biografia: perfil.biografia,
      github: perfil.github,
      linkedin: perfil.linkedin,
      sitioWeb: perfil.sitioWeb,
    },
  });
});

/**
 * @openapi
 * /api/v1/catalogo/tecnologias:
 *   get:
 *     tags: [Catálogo público]
 *     summary: Tecnologías usadas en proyectos publicados
 *     description: No requiere sesión. Ordenadas por cantidad de proyectos. Solo aparecen tecnologías con proyectos asociados.
 *     parameters:
 *       - { in: query, name: limite, schema: { type: integer, minimum: 1, maximum: 50, default: 12 } }
 *     responses:
 *       200:
 *         description: Lista de tecnologías con su total
 */
catalogoRouter.get("/tecnologias", async (req, res) => {
  const limite = z.coerce.number().int().min(1).max(50).catch(12).parse(req.query.limite);

  const proyectos = await prisma.proyecto.findMany({
    where: PUBLICO,
    select: { tecnologias: true },
  });

  const conteo = new Map<string, number>();
  for (const { tecnologias } of proyectos) {
    for (const t of new Set(tecnologias)) conteo.set(t, (conteo.get(t) ?? 0) + 1);
  }

  const lista = [...conteo.entries()]
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, "es"))
    .slice(0, limite);

  res.json(lista);
});

/**
 * @openapi
 * /api/v1/catalogo/anios:
 *   get:
 *     tags: [Catálogo público]
 *     summary: Años con proyectos publicados
 *     description: No requiere sesión. Años de publicación, del más reciente al más antiguo.
 *     responses:
 *       200: { description: Lista de años }
 */
catalogoRouter.get("/anios", async (_req, res) => {
  const proyectos = await prisma.proyecto.findMany({
    where: PUBLICO,
    select: { createdAt: true },
  });
  const anios = [...new Set(proyectos.map((p) => p.createdAt.getUTCFullYear()))].sort((a, b) => b - a);
  res.json(anios);
});
