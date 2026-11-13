// src/controllers/chatController.ts
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

// Mismo criterio que GET /perfiles: solo proyectos VALIDADOS y publicados
const PUBLICO = { estadoValidacion: "VALIDADO" as const, publicado: true };

const DISPONIBILIDAD: Record<string, string> = {
  TIEMPO_COMPLETO: "tiempo completo",
  TIEMPO_PARCIAL: "tiempo parcial",
  SOLO_PROYECTOS: "solo proyectos",
};

// Groq expone una API compatible con OpenAI; se llama con fetch, sin dependencias extra.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

class GroqError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function consultarGroq(model: string, contents: string, systemInstruction: string): Promise<string> {
  // La llave se lee al usarla, así dotenv ya la cargó
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Falta GROQ_API_KEY en el .env");

  const respuesta = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: contents },
      ],
    }),
  });

  if (!respuesta.ok) {
    throw new GroqError(`Groq respondió ${respuesta.status}: ${await respuesta.text()}`, respuesta.status);
  }
  const datos = (await respuesta.json()) as { choices?: { message?: { content?: string | null } }[] };
  return datos.choices?.[0]?.message?.content?.trim() ?? "";
}

// Reintenta si Groq está saturado (503) o limita la cuota (429),
// y si sigue fallando prueba con el modelo de respaldo (si lo configuraste).
async function generarConReintentos(contents: string, systemInstruction: string): Promise<string> {
  const modelos = [process.env.GROQ_MODEL ?? "openai/gpt-oss-120b", process.env.GROQ_FALLBACK_MODEL].filter(
    (m): m is string => Boolean(m),
  );

  let ultimoError: unknown;
  for (const model of modelos) {
    for (let intento = 0; intento < 3; intento++) {
      try {
        return await consultarGroq(model, contents, systemInstruction);
      } catch (error) {
        ultimoError = error;
        const status = (error as { status?: number }).status;
        if (status !== 503 && status !== 429) throw error; // otro error: no reintentar
        await sleep(1000 * 2 ** intento); // espera 1 s, 2 s, 4 s
      }
    }
  }
  throw ultimoError;
}

export const askChatbot = async (req: Request, res: Response) => {
  try {
    const message = req.body?.message;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "El mensaje es obligatorio" });
    }
    if (message.length > 500) {
      return res.status(400).json({ error: "El mensaje es demasiado largo (máx. 500 caracteres)" });
    }

    // 1. Portafolios públicos (sin correo, carnet ni historial académico)
    const estudiantes = await prisma.user.findMany({
      where: {
        rol: "ESTUDIANTE",
        perfil: { is: { proyectos: { some: PUBLICO } } },
      },
      orderBy: { nombre: "asc" },
      take: 50,
      select: {
        nombre: true,
        perfil: {
          select: {
            porcentajeAvance: true,
            disponibilidad: true,
            habilidades: true,
            proyectos: {
              where: PUBLICO,
              orderBy: { updatedAt: "desc" },
              take: 3,
              select: { titulo: true, descripcion: true, tecnologias: true },
            },
          },
        },
      },
    });

    const directorio = estudiantes.map((e) => ({
      nombre: e.nombre,
      avanceAcademico: `${e.perfil?.porcentajeAvance ?? 0}%`,
      disponibilidad: e.perfil?.disponibilidad
        ? (DISPONIBILIDAD[e.perfil.disponibilidad] ?? e.perfil.disponibilidad)
        : null,
      habilidades: e.perfil?.habilidades ?? [],
      proyectosValidados: (e.perfil?.proyectos ?? []).map((p) => ({
        titulo: p.titulo,
        descripcion: p.descripcion.slice(0, 200),
        tecnologias: p.tecnologias,
      })),
    }));

    // 2. System prompt con los datos
    const systemInstruction = `
Eres el asistente de la plataforma Workspace ULS, que muestra portafolios de estudiantes
de la Universidad Luterana Salvadoreña con proyectos validados por la coordinación.

Ayudas a empresas y visitantes a encontrar estudiantes por habilidades, tecnologías,
disponibilidad o proyectos. Responde en español, de forma amigable, clara y breve.

Usa únicamente estos datos del directorio:
${JSON.stringify(directorio, null, 2)}

Reglas:
- No inventes estudiantes, proyectos ni habilidades que no estén en los datos.
- Si la respuesta no está en los datos, dilo amablemente y sugiere ver la sección de portafolios.
- No pidas ni compartas correos, carnets ni datos de contacto.
`;

    // 3. Consultar a Groq (con reintentos)
    const response = await generarConReintentos(message, systemInstruction);

    return res.json({ response: response || "No pude generar una respuesta." });
  } catch (error) {
    console.error("Error en Chatbot Controller:", error);
    const status = (error as { status?: number }).status;
    if (status === 503 || status === 429) {
      return res
        .status(503)
        .json({ error: "El asistente tiene mucha demanda. Intenta de nuevo en un momento." });
    }
    return res.status(500).json({ error: "Error al procesar la respuesta del chatbot." });
  }
};