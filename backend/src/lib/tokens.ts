import jwt, { SignOptions } from "jsonwebtoken";
import { config } from "../config";

// "ver" permite invalidar el token al cambiar la contraseña (ver requireAuth)
export function signToken(user: { id: number; rol: string; tokenVersion: number }) {
  return jwt.sign({ rol: user.rol, ver: user.tokenVersion }, config.jwtSecret, {
    subject: String(user.id),
    expiresIn: config.jwtExpiresIn as SignOptions["expiresIn"],
  });
}

// Token de paso intermedio: solo sirve para enviar el código de 2FA, no da acceso a la API
const PASO_2FA = "2fa";

export function signTokenTemporal(user: { id: number; tokenVersion: number }) {
  return jwt.sign({ paso: PASO_2FA, ver: user.tokenVersion }, config.jwtSecret, {
    subject: String(user.id),
    expiresIn: "5m",
  });
}

export function verifyTokenTemporal(token: string): jwt.JwtPayload {
  const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
  if (payload.paso !== PASO_2FA) throw new Error("El token no es temporal");
  return payload;
}
