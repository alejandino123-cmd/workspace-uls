import { prisma } from "./prisma";

// Requisitos mínimos del perfil para que un estudiante pueda publicar un proyecto.
// Un proyecto solo es visible para el público si además está VALIDADO por Coordinación.
export interface RequisitosPublicacion {
  cumple: boolean;
  faltantes: string[];
}

export function evaluarRequisitos(perfil: {
  fotoUrl: string | null;
  biografia: string | null;
  habilidades: string[];
} | null): RequisitosPublicacion {
  const faltantes: string[] = [];
  if (!perfil?.fotoUrl) faltantes.push("Foto de perfil");
  if (!perfil?.biografia?.trim()) faltantes.push("Biografía");
  if (!perfil?.habilidades?.length) faltantes.push("Al menos una habilidad");
  return { cumple: faltantes.length === 0, faltantes };
}

export async function requisitosDe(userId: number): Promise<RequisitosPublicacion> {
  const perfil = await prisma.perfilEstudiante.findUnique({
    where: { userId },
    select: { fotoUrl: true, biografia: true, habilidades: true },
  });
  return evaluarRequisitos(perfil);
}

export function errorPerfilIncompleto(r: RequisitosPublicacion) {
  return {
    error: `Completa tu perfil antes de publicar: ${r.faltantes.join(", ")}`,
    code: "PERFIL_INCOMPLETO",
    faltantes: r.faltantes,
  };
}
