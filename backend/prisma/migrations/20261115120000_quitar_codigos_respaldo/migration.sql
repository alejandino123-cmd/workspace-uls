-- Se eliminan los códigos de respaldo de la autenticación en dos pasos
ALTER TABLE "User" DROP COLUMN "codigosRespaldo";
