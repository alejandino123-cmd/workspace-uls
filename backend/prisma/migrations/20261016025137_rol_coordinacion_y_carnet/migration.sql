/*
  Warnings:

  - The values [DOCENTE] on the enum `Rol` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `docenteId` on the `ValidacionProyecto` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[carnet]` on the table `PerfilEstudiante` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `coordinadorId` to the `ValidacionProyecto` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Rol_new" AS ENUM ('ESTUDIANTE', 'EMPRESA', 'COORDINACION');
ALTER TABLE "public"."User" ALTER COLUMN "rol" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "rol" TYPE "Rol_new" USING ("rol"::text::"Rol_new");
ALTER TYPE "Rol" RENAME TO "Rol_old";
ALTER TYPE "Rol_new" RENAME TO "Rol";
DROP TYPE "public"."Rol_old";
ALTER TABLE "User" ALTER COLUMN "rol" SET DEFAULT 'ESTUDIANTE';
COMMIT;

-- DropForeignKey
ALTER TABLE "ValidacionProyecto" DROP CONSTRAINT "ValidacionProyecto_docenteId_fkey";

-- AlterTable
ALTER TABLE "PerfilEstudiante" ADD COLUMN     "carnet" TEXT;

-- AlterTable
ALTER TABLE "ValidacionProyecto" DROP COLUMN "docenteId",
ADD COLUMN     "coordinadorId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PerfilEstudiante_carnet_key" ON "PerfilEstudiante"("carnet");

-- AddForeignKey
ALTER TABLE "ValidacionProyecto" ADD CONSTRAINT "ValidacionProyecto_coordinadorId_fkey" FOREIGN KEY ("coordinadorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
