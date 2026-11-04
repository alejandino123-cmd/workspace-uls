<<<<<<< HEAD
import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

export const config = {
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  // Dominio del correo institucional; los estudiantes solo pueden registrarse con él
  dominioInstitucional: (process.env.DOMINIO_INSTITUCIONAL ?? "uls.edu.sv").trim().toLowerCase(),
  // Fotos de perfil. Opcionales: sin ellas, PUT /perfil/foto responde 503
  cloudinary: {
    cloudName: (process.env.CLOUDINARY_CLOUD_NAME ?? "").trim(),
    apiKey: (process.env.CLOUDINARY_API_KEY ?? "").trim(),
    apiSecret: (process.env.CLOUDINARY_API_SECRET ?? "").trim(),
  },
=======
import "dotenv/config";
import path from "node:path";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

export const config = {
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
  // Clave de 32 bytes en base64 para cifrar los secretos de la autenticación en dos pasos
  cifradoKey: required("CIFRADO_KEY"),
  // Intentos fallidos permitidos cada 15 minutos por correo+IP (y por usuario al cambiar contraseña)
  loginMaxIntentos: Number(process.env.LOGIN_MAX_INTENTOS ?? 3),
  // Carpeta donde se guardan las imágenes subidas (fotos de perfil)
  uploadsDir: path.resolve(process.env.UPLOADS_DIR ?? "uploads"),
  fotoMaxBytes: 2 * 1024 * 1024,
  // Dominio del correo institucional; los estudiantes solo pueden registrarse con él
  dominioInstitucional: (process.env.DOMINIO_INSTITUCIONAL ?? "uls.edu.sv").trim().toLowerCase(),
>>>>>>> origin/fix-url-publica
};