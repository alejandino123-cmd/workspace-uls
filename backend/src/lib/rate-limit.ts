import { createHash } from "node:crypto";
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

// Chatbot: cada consulta cuesta una llamada a Gemini, así que se limitan todas (no solo las fallidas) por IP
export const limitarChatbot = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ""),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Has hecho demasiadas consultas al asistente. Espera unos minutos." },
});

// Cambio de contraseña: va después de requireAuth, así que la clave es el usuario autenticado.
export const limitarPorUsuario = crearLimitador((req) => {
  const usuario = (req as Request & { user?: { id: number } }).user?.id ?? "anonimo";
  return `usuario:${usuario}|${ipKeyGenerator(req.ip ?? "")}`;
});

// Código de 2FA: los intentos se cuentan por token temporal, así que cada inicio de sesión tiene su propio límite
export const limitarPorTokenTemporal = crearLimitador((req) => {
  const token = String(req.body?.tokenTemporal ?? "");
  return `2fa|${createHash("sha256").update(token).digest("hex")}`;
});
