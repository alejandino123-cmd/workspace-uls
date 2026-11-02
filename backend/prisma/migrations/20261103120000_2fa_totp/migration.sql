-- DropTable
DROP TABLE "QrSesion";

-- DropEnum
DROP TYPE "EstadoQr";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "codigosRespaldo" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "totpActivo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totpSecretoCifrado" TEXT;
