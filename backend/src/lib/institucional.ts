import { z } from "zod";
import { config } from "../config";

// El correo debe terminar exactamente en el dominio institucional (p. ej. @uls.edu.sv)
export function esCorreoInstitucional(email: string) {
  return email.toLowerCase().endsWith(`@${config.dominioInstitucional}`);
}

export const correoInstitucionalSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Correo inválido")
  .refine(esCorreoInstitucional, `Usa tu correo institucional (@${config.dominioInstitucional})`);
