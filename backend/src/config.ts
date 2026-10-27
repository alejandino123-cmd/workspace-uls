import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

export const config = {
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
  // Intentos fallidos permitidos cada 15 minutos por correo+IP (y por usuario al cambiar contraseña)
  loginMaxIntentos: Number(process.env.LOGIN_MAX_INTENTOS ?? 3),
  // Dominio del correo institucional; los estudiantes solo pueden registrarse con él
  dominioInstitucional: (process.env.DOMINIO_INSTITUCIONAL ?? "uls.edu.sv").trim().toLowerCase(),
};