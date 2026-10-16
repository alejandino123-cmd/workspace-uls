import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

// Cada estudiante necesita un carnet único
let contador = 0;
const carnetNuevo = () => `PR-${String(++contador).padStart(5, "0")}`;

async function registrar(email: string, conCarnet = true) {
  await request(app)
    .post("/api/v1/auth/register")
    .send({
      email,
      password: "Clave12345",
      nombre: "Test",
      ...(conCarnet ? { carnet: carnetNuevo() } : {}),
    });
  const r = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password: "Clave12345" });
  return r.body.token as string;
}

const valido = {
  titulo: "Sistema de inventario",
  descripcion: "App web para controlar inventario de una tienda.",
  urlRepositorio: "https://github.com/usuario/inventario",
  tecnologias: ["React", "react", "Node.js"],
};

let token: string;

beforeEach(async () => {
  await prisma.user.deleteMany(); // cascada: perfil y proyectos
  token = await registrar("ana@test.com");
});

afterAll(async () => {
  await prisma.$disconnect();
});

const auth = () => ({ Authorization: `Bearer ${token}` });

describe("/api/v1/proyectos", () => {
  it("401 sin token", async () => {
    expect((await request(app).get("/api/v1/proyectos")).status).toBe(401);
  });

  it("crea proyecto PENDIENTE y limpia tecnologías", async () => {
    const r = await request(app).post("/api/v1/proyectos").set(auth()).send(valido);
    expect(r.status).toBe(201);
    expect(r.body.estadoValidacion).toBe("PENDIENTE");
    expect(r.body.tecnologias).toEqual(["React", "Node.js"]);
  });

  it("403 CARNET_REQUERIDO sin carnet, y deja crear cuando lo registra", async () => {
    const sinCarnet = await registrar("sin@test.com", false);
    const h = { Authorization: `Bearer ${sinCarnet}` };

    const bloqueado = await request(app).post("/api/v1/proyectos").set(h).send(valido);
    expect(bloqueado.status).toBe(403);
    expect(bloqueado.body.code).toBe("CARNET_REQUERIDO");
    expect(await prisma.proyecto.count()).toBe(0);

    // Completa el carnet (en minúsculas: se normaliza a mayúsculas)
    const perfil = await request(app).put("/api/v1/perfil").set(h).send({ carnet: "zz-0001" });
    expect(perfil.status).toBe(200);
    expect(perfil.body.perfil.carnet).toBe("ZZ-0001");

    const ok = await request(app).post("/api/v1/proyectos").set(h).send(valido);
    expect(ok.status).toBe(201);
  });

  it("los datos inválidos se reportan antes que el carnet faltante", async () => {
    const sinCarnet = await registrar("sin@test.com", false);
    const r = await request(app)
      .post("/api/v1/proyectos")
      .set({ Authorization: `Bearer ${sinCarnet}` })
      .send({ ...valido, titulo: "ab" });
    expect(r.status).toBe(400);
  });

  it("ignora un estadoValidacion enviado por el cliente", async () => {
    const r = await request(app)
      .post("/api/v1/proyectos").set(auth())
      .send({ ...valido, estadoValidacion: "VALIDADO" });
    expect(r.body.estadoValidacion).toBe("PENDIENTE");
  });

  it("rechaza datos inválidos (título corto, URL no http)", async () => {
    const a = await request(app).post("/api/v1/proyectos").set(auth()).send({ ...valido, titulo: "ab" });
    const b = await request(app).post("/api/v1/proyectos").set(auth())
      .send({ ...valido, urlDemo: "javascript:alert(1)" });
    expect(a.status).toBe(400);
    expect(b.status).toBe(400);
  });

  it("lista solo mis proyectos", async () => {
    await request(app).post("/api/v1/proyectos").set(auth()).send(valido);
    const otro = await registrar("beto@test.com");
    const r = await request(app).get("/api/v1/proyectos").set({ Authorization: `Bearer ${otro}` });
    expect(r.body).toEqual([]);
  });

  it("PUT parcial: cambia lo enviado, borra con null y vuelve a PENDIENTE", async () => {
    const { body } = await request(app).post("/api/v1/proyectos").set(auth()).send(valido);
    await prisma.proyecto.update({ where: { id: body.id }, data: { estadoValidacion: "VALIDADO" } });

    const r = await request(app)
      .put(`/api/v1/proyectos/${body.id}`).set(auth())
      .send({ urlRepositorio: null });
    expect(r.status).toBe(200);
    expect(r.body.urlRepositorio).toBeNull();
    expect(r.body.titulo).toBe(valido.titulo);
    expect(r.body.estadoValidacion).toBe("PENDIENTE");
  });

  it("PUT con cuerpo vacío da 400", async () => {
    const { body } = await request(app).post("/api/v1/proyectos").set(auth()).send(valido);
    const r = await request(app).put(`/api/v1/proyectos/${body.id}`).set(auth()).send({});
    expect(r.status).toBe(400);
  });

  it("404 al ver, editar o borrar el proyecto de otro", async () => {
    const { body } = await request(app).post("/api/v1/proyectos").set(auth()).send(valido);
    const otro = { Authorization: `Bearer ${await registrar("beto@test.com")}` };
    expect((await request(app).get(`/api/v1/proyectos/${body.id}`).set(otro)).status).toBe(404);
    expect((await request(app).put(`/api/v1/proyectos/${body.id}`).set(otro).send({ titulo: "Hackeado" })).status).toBe(404);
    expect((await request(app).delete(`/api/v1/proyectos/${body.id}`).set(otro)).status).toBe(404);
    expect(await prisma.proyecto.count()).toBe(1);
  });

  it("DELETE da 204 y luego 404", async () => {
    const { body } = await request(app).post("/api/v1/proyectos").set(auth()).send(valido);
    expect((await request(app).delete(`/api/v1/proyectos/${body.id}`).set(auth())).status).toBe(204);
    expect((await request(app).get(`/api/v1/proyectos/${body.id}`).set(auth())).status).toBe(404);
  });

  it("id no numérico da 400", async () => {
    expect((await request(app).get("/api/v1/proyectos/abc").set(auth())).status).toBe(400);
  });
});