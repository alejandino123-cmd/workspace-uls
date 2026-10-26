import { z } from "zod";

export function validationError(error: z.ZodError) {
  return {
    error: "Datos inválidos",
    detalles: error.issues.map((i) => ({
      campo: i.path.join("."),
      mensaje: i.message,
    })),
  };
}

// Quita repetidos sin distinguir mayúsculas y conserva la primera escritura
function sinRepetidas(lista: string[]) {
  const vistas = new Set<string>();
  return lista.filter((item) => {
    const clave = item.toLowerCase();
    if (vistas.has(clave)) return false;
    vistas.add(clave);
    return true;
  });
}

export const etiquetasSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1, "No puede estar vacía")
      .max(40, "Máximo 40 caracteres")
      .transform((texto) => texto.replace(/\s+/g, " ")),
  )
  .max(30, "Máximo 30 elementos")
  .transform(sinRepetidas);
  
  export const carnetSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{4,20}$/, "Carnet inválido (4 a 20 caracteres: letras, números o guion)");