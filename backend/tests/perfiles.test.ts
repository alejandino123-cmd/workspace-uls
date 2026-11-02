import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

// Cada estudiante necesita un carnet único
let contadorCarnet = 0;

async function estudiante(email: string, nombre = "Ana López") {
  const r = await request(app)
    .post("/api/v1/auth/register")
    .send({
      nombre,
      email,
      password: "Clave12345",
      carnet: `PF-${String(++contadorCarnet).padStart(5, "0")}`,
    });
  return { token: r.body.token as string, id: r.body.user.id as number };
}

async function proyecto(token: string, titulo: string) {
  const r = await request(app)
    .post("/api/v1/proyectos")
    .set(bearer(token))
    .send({ titulo, descripcion: "Descripción de prueba del proyecto." });
  // si falla (por ejemplo, 403 CARNET_REQUERIDO) el error se ve claro en vez de un id undefined
  if (r.status !== 201) {
    throw new Error(`No se pudo crear el proyecto (${r.status}): ${JSON.stringify(r.body)}`);
  }
  return (r.body.proyecto?.id ?? r.body.id) as number;
}

beforeEach(async () => {
  await prisma.validacionProyecto.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/v1/perfiles/:userId (público)", () => {
  it("funciona sin token y muestra solo proyectos validados", async () => {
    const est = await estudiante("ana@uls.edu.sv");
    await request(app)
      .put("/api/v1/perfil")
      .set(bearer(est.token))
      .send({
        carnet: "CS-2026-001",
        porcentajeAvance: 70,
        habilidades: ["Vue.js", "Node.js"],
        historialAcademico: "Dato privado",
      });
    const validado = await proyecto(est.token, "Proyecto validado");
    await proyecto(est.token, "Proyecto pendiente");
    await prisma.proyecto.update({
      where: { id: validado },
      data: { estadoValidacion: "VALIDADO", publicado: true },
    });

    const r = await request(app).get(`/api/v1/perfiles/${est.id}`);
    expect(r.status).toBe(200);
    expect(r.body.estudiante).toEqual({ id: est.id, nombre: "Ana López", fotoUrl: null });
    expect(r.body.perfil.habilidades).toEqual(["Vue.js", "Node.js"]);
    expect(r.body.perfil.porcentajeAvance).toBe(70);
    expect(r.body.perfil.carnet).toBeUndefined();
    expect(r.body.proyectos.map((p: { titulo: string }) => p.titulo)).toEqual(["Proyecto validado"]);
  });

  it("nunca expone correo, carnet ni historial académico", async () => {
    const est = await estudiante("ana@uls.edu.sv");
    await request(app)
      .put("/api/v1/perfil")
      .set(bearer(est.token))
      .send({ carnet: "CS-2026-001", historialAcademico: "Dato privado" });

    const r = await request(app).get(`/api/v1/perfiles/${est.id}`);
    const texto = JSON.stringify(r.body);
    expect(texto).not.toContain("ana@uls.edu.sv");
    expect(texto).not.toContain("CS-2026-001");
    expect(texto).not.toContain("Dato privado");
    expect(texto).not.toContain("passwordHash");
  });

  it("un estudiante sin perfil devuelve valores vacíos", async () => {
    const est = await estudiante("ana@uls.edu.sv");
    const r = await request(app).get(`/api/v1/perfiles/${est.id}`);
    expect(r.status).toBe(200);
    expect(r.body.perfil).toEqual({ porcentajeAvance: 0, disponibilidad: null, habilidades: [] });
    expect(r.body.proyectos).toEqual([]);
  });

  it("404 si no existe o no es estudiante; 400 con id inválido", async () => {
    await prisma.user.create({
      data: { email: "doc@uls.edu.sv", nombre: "Doc", rol: "COORDINACION", passwordHash: "x" },
    });
    const doc = await prisma.user.findUnique({ where: { email: "doc@uls.edu.sv" } });
    expect((await request(app).get(`/api/v1/perfiles/${doc!.id}`)).status).toBe(404);
    expect((await request(app).get("/api/v1/perfiles/99999")).status).toBe(404);
    expect((await request(app).get("/api/v1/perfiles/abc")).status).toBe(400);
  });
});

describe("GET /api/v1/perfiles/:userId — solo proyectos publicados", () => {
  it("oculta un proyecto validado que el estudiante no publicó", async () => {
    const est = await estudiante("ana@uls.edu.sv");
    const id = await proyecto(est.token, "Proyecto privado");
    await prisma.proyecto.update({ where: { id }, data: { estadoValidacion: "VALIDADO" } });

    const r = await request(app).get(`/api/v1/perfiles/${est.id}`);
    expect(r.body.proyectos).toEqual([]);
  });
});

describe("GET /api/v1/perfiles (listado público)", () => {
  it("sin token, lista solo estudiantes con un proyecto validado y publicado", async () => {
    const ana = await estudiante("ana@uls.edu.sv", "Ana López");
    const beto = await estudiante("beto@uls.edu.sv", "Beto Mejía");
    const publicado = await proyecto(ana.token, "Publicado");
    await prisma.proyecto.update({
      where: { id: publicado },
      data: { estadoValidacion: "VALIDADO", publicado: true },
    });
    const privado = await proyecto(beto.token, "Privado");
    await prisma.proyecto.update({ where: { id: privado }, data: { estadoValidacion: "VALIDADO" } });

    const r = await request(app).get("/api/v1/perfiles");
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(1);
    expect(r.body.estudiantes[0]).toMatchObject({ id: ana.id, nombre: "Ana López", totalProyectos: 1 });
    const texto = JSON.stringify(r.body);
    expect(texto).not.toContain("ana@uls.edu.sv");
    expect(texto).not.toContain("PF-");
  });

  it("filtra por nombre y valida la paginación", async () => {
    for (const [email, nombre] of [["ana@uls.edu.sv", "Ana López"], ["beto@uls.edu.sv", "Beto Mejía"]]) {
      const est = await estudiante(email, nombre);
      const id = await proyecto(est.token, `Proyecto de ${nombre}`);
      await prisma.proyecto.update({
        where: { id },
        data: { estadoValidacion: "VALIDADO", publicado: true },
      });
    }

    const filtrado = await request(app).get("/api/v1/perfiles?buscar=beto");
    expect(filtrado.body.total).toBe(1);
    expect(filtrado.body.estudiantes[0].nombre).toBe("Beto Mejía");

    expect((await request(app).get("/api/v1/perfiles?limit=0")).status).toBe(400);
  });
});
