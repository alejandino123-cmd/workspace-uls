import { timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

// Cabeceras HTTP de seguridad para todas las respuestas de la API
export function cabecerasSeguridad(req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff"); // el navegador no adivina tipos de archivo
  res.setHeader("X-Frame-Options", "DENY"); // nadie puede incrustar la API en un iframe
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (req.secure) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
}

function iguales(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// Protege /reference y /openapi.json con usuario y contraseña (HTTP Basic).
// - Con DOCS_USUARIO y DOCS_PASSWORD definidos: siempre pide credenciales.
// - Sin ellos: abierta en desarrollo y oculta (404) en producción.
export function protegerDocs(req: Request, res: Response, next: NextFunction) {
  const usuario = process.env.DOCS_USUARIO;
  const password = process.env.DOCS_PASSWORD;

  if (!usuario || !password) {
    if (process.env.NODE_ENV === "production") return res.status(404).json({ error: "No encontrado" });
    return next();
  }

  const [esquema, valor] = (req.headers.authorization ?? "").split(" ");
  if (esquema === "Basic" && valor) {
    const texto = Buffer.from(valor, "base64").toString("utf8");
    const separador = texto.indexOf(":");
    const u = texto.slice(0, separador);
    const p = texto.slice(separador + 1);
    if (separador > 0 && iguales(u, usuario) && iguales(p, password)) return next();
  }

  res.setHeader("WWW-Authenticate", 'Basic realm="Documentacion Workspace ULS", charset="UTF-8"');
  res.status(401).json({ error: "Credenciales requeridas para ver la documentación" });
}
