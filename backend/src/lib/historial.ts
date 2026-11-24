import type { Prisma, EventoProyecto } from "../generated/prisma/client";

type Tx = Prisma.TransactionClient;

export const DIAS_PLAZO_POR_DEFECTO = 7;

export function registrarEvento(
  tx: Tx,
  datos: {
    proyectoId: number;
    evento: EventoProyecto;
    actorId: number | null;
    comentario?: string | null;
    fechaLimite?: Date | null;
    fueraDePlazo?: boolean;
  },
) {
  return tx.historialProyecto.create({ data: { comentario: null, fechaLimite: null, ...datos } });
}

// El estudiante cambió el contenido visible: el proyecto vuelve a revisión.
// Si estaba RECHAZADO, el evento es una corrección (y se marca si llegó fuera de plazo).
export async function reiniciarRevision(tx: Tx, proyectoId: number, actorId: number) {
  const actual = await tx.proyecto.findUnique({
    where: { id: proyectoId },
    select: { estadoValidacion: true, fechaLimiteCorreccion: true },
  });
  if (!actual) return;

  await tx.proyecto.update({
    where: { id: proyectoId },
    data: { estadoValidacion: "PENDIENTE", fechaLimiteCorreccion: null },
  });
  await tx.validacionProyecto.deleteMany({ where: { proyectoId } });

  const eraRechazado = actual.estadoValidacion === "RECHAZADO";
  await registrarEvento(tx, {
    proyectoId,
    evento: eraRechazado ? "CORREGIDO" : "EDITADO",
    actorId,
    fueraDePlazo: Boolean(
      eraRechazado && actual.fechaLimiteCorreccion && actual.fechaLimiteCorreccion.getTime() < Date.now(),
    ),
  });
}
