import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { prisma } from "../lib/prisma";

export interface AuthRequest extends Request {
  user?: { id: number; rol: string };
}

// El rol y la vigencia se leen de la base de datos en cada petición, no del token
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }

  // Los tokens de paso intermedio (2FA) no dan acceso a la API
  const id = Number(payload.sub);
  if (payload.paso || !Number.isInteger(id)) return res.status(401).json({ error: "Token inválido o expirado" });

  const usuario = await prisma.user.findUnique({
    where: { id },
    select: { id: true, rol: true, tokenVersion: true },
  });
  // Sesión vencida si la cuenta ya no existe o si la contraseña cambió después de emitir el token
  if (!usuario || payload.ver !== usuario.tokenVersion) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }

  req.user = { id: usuario.id, rol: usuario.rol };
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ error: "No tienes permiso para esta acción" });
    }
    next();
  };
}
