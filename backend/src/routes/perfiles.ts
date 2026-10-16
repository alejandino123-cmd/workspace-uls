import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export const perfilesRouter = Router();

const idSchema = z.coerce.number().int().positive();

/**
 * @openapi
 * /api/v1/perfiles/{userId}:
 *   get:
 *     tags: [Perfiles públicos]
 *     summary: Ver el perfil público de un estudiante
 *     description: >
 *       No requiere sesión. Solo muestra habilidades, avance, disponibilidad y los
 *       proyectos VALIDADOS. Nunca incluye correo ni historial académico.
 *     parameters:
 *       - { in: path, name: userId, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: Perfil público
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
          porcentajeAvance: true,
          disponibilidad: true,
          habilidades: true,
          proyectos: {
            where: { estadoValidacion: "VALIDADO" },
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
    estudiante: { id: user.id, nombre: user.nombre },
    perfil: {
      porcentajeAvance: perfil?.porcentajeAvance ?? 0,
      disponibilidad: perfil?.disponibilidad ?? null,
      habilidades: perfil?.habilidades ?? [],
    },
    proyectos: perfil?.proyectos ?? [],
  });
});