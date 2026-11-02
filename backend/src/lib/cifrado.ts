import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { config } from "../config";

const clave = Buffer.from(config.cifradoKey, "base64");
if (clave.length !== 32) throw new Error("CIFRADO_KEY debe ser una clave de 32 bytes en base64");

// AES-256-GCM: cada valor cifrado lleva su propio IV y una etiqueta que detecta cualquier alteración
export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", clave, iv);
  const cuerpo = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), cuerpo]).toString("base64");
}

export function descifrar(dato: string): string {
  const buf = Buffer.from(dato, "base64");
  const decipher = createDecipheriv("aes-256-gcm", clave, buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}
