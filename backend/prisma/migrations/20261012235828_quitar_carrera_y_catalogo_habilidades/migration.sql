/*
  Warnings:

  - You are about to drop the column `carrera` on the `PerfilEstudiante` table. All the data in the column will be lost.
  - You are about to drop the `Habilidad` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_HabilidadToPerfilEstudiante` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_HabilidadToProyecto` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_HabilidadToPerfilEstudiante" DROP CONSTRAINT "_HabilidadToPerfilEstudiante_A_fkey";

-- DropForeignKey
ALTER TABLE "_HabilidadToPerfilEstudiante" DROP CONSTRAINT "_HabilidadToPerfilEstudiante_B_fkey";

-- DropForeignKey
ALTER TABLE "_HabilidadToProyecto" DROP CONSTRAINT "_HabilidadToProyecto_A_fkey";

-- DropForeignKey
ALTER TABLE "_HabilidadToProyecto" DROP CONSTRAINT "_HabilidadToProyecto_B_fkey";

-- AlterTable
ALTER TABLE "PerfilEstudiante" DROP COLUMN "carrera",
ADD COLUMN     "habilidades" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Proyecto" ADD COLUMN     "tecnologias" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DropTable
DROP TABLE "Habilidad";

-- DropTable
DROP TABLE "_HabilidadToPerfilEstudiante";

-- DropTable
DROP TABLE "_HabilidadToProyecto";
