-- CreateEnum
CREATE TYPE "EstadoQr" AS ENUM ('PENDIENTE', 'APROBADA', 'USADA');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fotoArchivo" TEXT,
ADD COLUMN     "fotoTipo" TEXT;

-- CreateTable
CREATE TABLE "QrSesion" (
    "id" TEXT NOT NULL,
    "secretoHash" TEXT NOT NULL,
    "estado" "EstadoQr" NOT NULL DEFAULT 'PENDIENTE',
    "userId" INTEGER,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QrSesion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "QrSesion" ADD CONSTRAINT "QrSesion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
