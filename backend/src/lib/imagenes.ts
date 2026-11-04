import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config";

export type TipoImagen = "image/jpeg" | "image/png" | "image/webp";

const EXTENSION: Record<TipoImagen, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Se mira la firma del archivo (sus primeros bytes), no el nombre ni el tipo que envía el cliente
export function detectarTipo(buf: Buffer): TipoImagen | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  const firmaPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length >= 8 && buf.subarray(0, 8).equals(firmaPng)) return "image/png";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }
  return null;
}

// Devuelve el nombre del archivo guardado. El nombre lo genera el servidor, nunca el cliente.
export async function guardarImagen(buf: Buffer, tipo: TipoImagen): Promise<string> {
  await fs.mkdir(config.uploadsDir, { recursive: true });
  const nombre = `${randomUUID()}.${EXTENSION[tipo]}`;
  await fs.writeFile(path.join(config.uploadsDir, nombre), buf);
  return nombre;
}

export async function borrarImagen(nombre: string) {
  await fs.rm(path.join(config.uploadsDir, nombre), { force: true });
}

export function rutaImagen(nombre: string) {
  return path.join(config.uploadsDir, nombre);
}
