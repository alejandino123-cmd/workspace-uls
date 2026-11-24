-- Plazo para corregir proyectos rechazados y línea de tiempo de cada proyecto

-- CreateEnum
CREATE TYPE "EventoProyecto" AS ENUM ('CREADO', 'EDITADO', 'CORREGIDO', 'VALIDADO', 'RECHAZADO', 'PUBLICADO', 'OCULTADO');

-- AlterTable
ALTER TABLE "Proyecto" ADD COLUMN "fechaLimiteCorreccion" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "HistorialProyecto" (
    "id" SERIAL NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    "evento" "EventoProyecto" NOT NULL,
    "actorId" INTEGER,
    "comentario" TEXT,
    "fechaLimite" TIMESTAMP(3),
    "fueraDePlazo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialProyecto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistorialProyecto_proyectoId_createdAt_idx" ON "HistorialProyecto"("proyectoId", "createdAt");

-- AddForeignKey
ALTER TABLE "HistorialProyecto" ADD CONSTRAINT "HistorialProyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialProyecto" ADD CONSTRAINT "HistorialProyecto_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Historial inicial de los proyectos que ya existen: su creación y su última evaluación
INSERT INTO "HistorialProyecto" ("proyectoId", "evento", "actorId", "createdAt")
SELECT p."id", 'CREADO', pe."userId", p."createdAt"
FROM "Proyecto" p
JOIN "PerfilEstudiante" pe ON pe."id" = p."perfilId";

INSERT INTO "HistorialProyecto" ("proyectoId", "evento", "actorId", "comentario", "createdAt")
SELECT v."proyectoId", p."estadoValidacion"::text::"EventoProyecto", v."coordinadorId", v."comentario", v."createdAt"
FROM "ValidacionProyecto" v
JOIN "Proyecto" p ON p."id" = v."proyectoId"
WHERE p."estadoValidacion" IN ('VALIDADO', 'RECHAZADO');
