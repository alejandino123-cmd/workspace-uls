import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { validationError, etiquetasSchema } from "../lib/validation";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

export const perfilRouter = Router();

// Todo lo que cuelga de este router exige sesión y rol ESTUDIANTE
perfilRouter.use(requireAuth, requireRole("ESTUDIANTE"));

// Campos que se devuelven al cliente (sin userId)
const perfilSelect = {
  id: true,
  porcentajeAvance: true,
  historialAcademico: true,
  disponibilidad: true,
  habilidades: true,
} as const;

const updateSchema = z
  .object({
    porcentajeAvance: z.number().int().min(0, "Mínimo 0").max(100, "Máximo 100").optional(),
    historialAcademico: z.string().trim().max(2000, "Máximo 2000 caracteres").nullable().optional(),
    disponibilidad: z
      .enum(["TIEMPO_COMPLETO", "TIEMPO_PARCIAL", "SOLO_PROYECTOS"])
      .nullable()
      .optional(),
    habilidades: etiquetasSchema.optional(),
  })
  .refine((datos) => Object.keys(datos).length > 0, {
    message: "Envía al menos un campo para actualizar",
  });

/**
 * @openapi
 * /api/v1/perfil:
 *   get:
 *     summary: Obtener el perfil del estudiante autenticado
 *     description: Si el estudiante aún no tiene perfil, se crea uno vacío.
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del estudiante
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PerfilResponse'
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 */
perfilRouter.get("/", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const perfil = await prisma.perfilEstudiante.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: perfilSelect,
  });
  res.json({ perfil });
});

/**
 * @openapi
 * /api/v1/perfil:
 *   put:
 *     summary: Actualizar el perfil del estudiante autenticado
 *     description: >
 *       Solo se actualizan los campos enviados. Si se envía `habilidades`,
 *       reemplaza por completo la lista anterior (se limpian espacios y
 *       se eliminan repetidas sin distinguir mayúsculas).
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               porcentajeAvance: { type: integer, minimum: 0, maximum: 100, example: 60 }
 *               historialAcademico: { type: string, nullable: true }
 *               disponibilidad:
 *                 type: string
 *                 nullable: true
 *                 enum: [TIEMPO_COMPLETO, TIEMPO_PARCIAL, SOLO_PROYECTOS]
 *                 example: TIEMPO_PARCIAL
 *               habilidades:
 *                 type: array
 *                 maxItems: 30
 *                 items: { type: string, maxLength: 40 }
 *                 example: [Vue.js, Node.js, PostgreSQL]
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PerfilResponse'
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { $ref: '#/components/responses/NoAutenticado' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 */
perfilRouter.put("/", async (req: AuthRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationError(parsed.error));

  const userId = req.user!.id;
  const perfil = await prisma.perfilEstudiante.upsert({
    where: { userId },
    create: { userId, ...parsed.data },
    update: parsed.data,
    select: perfilSelect,
  });

  res.json({ perfil });
});