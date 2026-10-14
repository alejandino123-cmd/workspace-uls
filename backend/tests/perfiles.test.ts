import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

async function estudiante(email: string) {
  const r = await request(app)
    .post("/api/v1/auth/register")
    .send({ nombre: "Ana López", email, password: "Clave12345" });
  return { token: r.body.token as string, id: r.body.user.id as number };
}

async function proyecto(token: string, titulo: string) {
  const r = await request(app)
    .post("/api/v1/proyectos")
    .set(bearer(token))
    .send({ titulo, descripcion: "Descripción de prueba del proyecto." });
  return r.body.id as number;
}

beforeEach(async () => {
  await prisma.validacionDocente.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/v1/perfiles/:userId (público)", () => {
  it("funciona sin token y muestra solo proyectos validados", async () => {
    const est = await estudiante("ana@gmail.com");
    await request(app)
      .put("/api/v1/perfil")
      .set(bearer(est.token))
      .send({ porcentajeAvance: 70, habilidades: ["Vue.js", "Node.js"], historialAcademico: "Dato privado" });
    const validado = await proyecto(est.token, "Proyecto validado");
    await proyecto(est.token, "Proyecto pendiente");
    await prisma.proyecto.update({ where: { id: validado }, data: { estadoValidacion: "VALIDADO" } });

    const r = await request(app).get(`/api/v1/perfiles/${est.id}`);
    expect(r.status).toBe(200);
    expect(r.body.estudiante).toEqual({ id: est.id, nombre: "Ana López" });
    expect(r.body.perfil.habilidades).toEqual(["Vue.js", "Node.js"]);
    expect(r.body.perfil.porcentajeAvance).toBe(70);
    expect(r.body.proyectos.map((p: { titulo: string }) => p.titulo)).toEqual(["Proyecto validado"]);
  });

  it("nunca expone correo ni historial académico", async () => {
    const est = await estudiante("ana@gmail.com");
    await request(app)
      .put("/api/v1/perfil")
      .set(bearer(est.token))
      .send({ historialAcademico: "Dato privado" });

    const r = await request(app).get(`/api/v1/perfiles/${est.id}`);
    const texto = JSON.stringify(r.body);
    expect(texto).not.toContain("ana@gmail.com");
    expect(texto).not.toContain("Dato privado");
    expect(texto).not.toContain("passwordHash");
  });

  it("un estudiante sin perfil devuelve valores vacíos", async () => {
    const est = await estudiante("ana@gmail.com");
    const r = await request(app).get(`/api/v1/perfiles/${est.id}`);
    expect(r.status).toBe(200);
    expect(r.body.perfil).toEqual({ porcentajeAvance: 0, disponibilidad: null, habilidades: [] });
    expect(r.body.proyectos).toEqual([]);
  });

  it("404 si no existe o no es estudiante; 400 con id inválido", async () => {
    await prisma.user.create({
      data: { email: "doc@uls.edu.sv", nombre: "Doc", rol: "DOCENTE", passwordHash: "x" },
    });
    const doc = await prisma.user.findUnique({ where: { email: "doc@uls.edu.sv" } });
    expect((await request(app).get(`/api/v1/perfiles/${doc!.id}`)).status).toBe(404);
    expect((await request(app).get("/api/v1/perfiles/99999")).status).toBe(404);
    expect((await request(app).get("/api/v1/perfiles/abc")).status).toBe(400);
  });
});