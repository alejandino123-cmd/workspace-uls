-- Las fotos de perfil ahora se guardan en Cloudinary (PerfilEstudiante.fotoUrl)
-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "fotoArchivo",
DROP COLUMN IF EXISTS "fotoTipo";
