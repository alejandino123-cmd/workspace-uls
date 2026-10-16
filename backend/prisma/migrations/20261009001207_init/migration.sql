-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ESTUDIANTE', 'DOCENTE', 'EMPRESA', 'COORDINACION');

-- CreateEnum
CREATE TYPE "Disponibilidad" AS ENUM ('TIEMPO_COMPLETO', 'TIEMPO_PARCIAL', 'SOLO_PROYECTOS');

-- CreateEnum
CREATE TYPE "EstadoValidacion" AS ENUM ('PENDIENTE', 'VALIDADO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'ESTUDIANTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerfilEstudiante" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "carrera" TEXT,
    "porcentajeAvance" INTEGER NOT NULL DEFAULT 0,
    "historialAcademico" TEXT,
    "disponibilidad" "Disponibilidad",

    CONSTRAINT "PerfilEstudiante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Habilidad" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Habilidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proyecto" (
    "id" SERIAL NOT NULL,
    "perfilId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "urlRepositorio" TEXT,
    "urlDemo" TEXT,
    "urlDocumentacion" TEXT,
    "estadoValidacion" "EstadoValidacion" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidacionProyecto" (
    "id" SERIAL NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    "docenteId" INTEGER NOT NULL,
    "comentario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValidacionProyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_HabilidadToPerfilEstudiante" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_HabilidadToPerfilEstudiante_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_HabilidadToProyecto" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_HabilidadToProyecto_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PerfilEstudiante_userId_key" ON "PerfilEstudiante"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Habilidad_nombre_key" ON "Habilidad"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "ValidacionProyecto_proyectoId_key" ON "ValidacionProyecto"("proyectoId");

-- CreateIndex
CREATE INDEX "_HabilidadToPerfilEstudiante_B_index" ON "_HabilidadToPerfilEstudiante"("B");

-- CreateIndex
CREATE INDEX "_HabilidadToProyecto_B_index" ON "_HabilidadToProyecto"("B");

-- AddForeignKey
ALTER TABLE "PerfilEstudiante" ADD CONSTRAINT "PerfilEstudiante_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "PerfilEstudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidacionProyecto" ADD CONSTRAINT "ValidacionProyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidacionProyecto" ADD CONSTRAINT "ValidacionProyecto_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HabilidadToPerfilEstudiante" ADD CONSTRAINT "_HabilidadToPerfilEstudiante_A_fkey" FOREIGN KEY ("A") REFERENCES "Habilidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HabilidadToPerfilEstudiante" ADD CONSTRAINT "_HabilidadToPerfilEstudiante_B_fkey" FOREIGN KEY ("B") REFERENCES "PerfilEstudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HabilidadToProyecto" ADD CONSTRAINT "_HabilidadToProyecto_A_fkey" FOREIGN KEY ("A") REFERENCES "Habilidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HabilidadToProyecto" ADD CONSTRAINT "_HabilidadToProyecto_B_fkey" FOREIGN KEY ("B") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
