import type { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { config } from "../config";

// Cada combinación (clave) tiene su propio contador. Solo cuentan los intentos fallidos.
export function crearLimitador(clave: (req: Request) => string, max = config.loginMaxIntentos) {
  return rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: max,
    skipSuccessfulRequests: true,
    keyGenerator: clave,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo." },
  });
}

// Correo + IP: si alguien falla con una cuenta, solo se bloquea esa cuenta desde esa IP.
// Otras personas de la misma red (o la misma cuenta desde otra IP) no se ven afectadas.
export const claveCorreo = (req: Request) => {
  const correo = String(req.body?.email ?? "").trim().toLowerCase();
  return `${ipKeyGenerator(req.ip ?? "")}|${correo}`;
};
export const limitarPorCorreo = crearLimitador(claveCorreo);

// Cambio de contraseña: va después de requireAuth, así que la clave es el usuario autenticado.
export const limitarPorUsuario = crearLimitador((req) => {
  const usuario = (req as Request & { user?: { id: number } }).user?.id ?? "anonimo";
  return `usuario:${usuario}|${ipKeyGenerator(req.ip ?? "")}`;
});
