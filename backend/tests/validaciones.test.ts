import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

async function estudiante(email: string) {
  const r = await request(app)
    .post("/api/v1/auth/register")
    .send({ nombre: "Ana López", email, password: "Clave12345" });
  return r.body.token as string;
}

async function docente(email = "doc@uls.edu.sv") {
  await prisma.user.create({
    data: { email, nombre: "Doc Pérez", rol: "DOCENTE", passwordHash: await bcrypt.hash("Clave12345", 10) },
  });
  const r = await request(app).post("/api/v1/auth/login").send({ email, password: "Clave12345" });
  return r.body.token as string;
}

async function proyecto(token: string, titulo = "Sistema de inventario") {
  const r = await request(app)
    .post("/api/v1/proyectos")
    .set(bearer(token))
    .send({ titulo, descripcion: "App web para controlar inventario." });
  return r.body.id as number;
}

beforeEach(async () => {
  await prisma.validacionDocente.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("validación docente", () => {
  it("401 sin token y 403 para estudiante", async () => {
    expect((await request(app).get("/api/v1/validaciones/pendientes")).status).toBe(401);
    const est = await estudiante("ana@gmail.com");
    const id = await proyecto(est);
    expect((await request(app).get("/api/v1/validaciones/pendientes").set(bearer(est))).status).toBe(403);
    const r = await request(app).post(`/api/v1/validaciones/${id}`).set(bearer(est)).send({ estado: "VALIDADO" });
    expect(r.status).toBe(403);
  });

  it("lista solo pendientes, con los datos del estudiante", async () => {
    const est = await estudiante("ana@gmail.com");
    const doc = await docente();
    const a = await proyecto(est, "Proyecto A");
    await proyecto(est, "Proyecto B");
    await request(app).post(`/api/v1/validaciones/${a}`).set(bearer(doc)).send({ estado: "VALIDADO" });

    const r = await request(app).get("/api/v1/validaciones/pendientes").set(bearer(doc));
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(1);
    expect(r.body[0].titulo).toBe("Proyecto B");
    expect(r.body[0].estudiante.email).toBe("ana@gmail.com");
  });

  it("valida y el estudiante ve el estado y el comentario", async () => {
    const est = await estudiante("ana@gmail.com");
    const doc = await docente();
    const id = await proyecto(est);

    const r = await request(app)
      .post(`/api/v1/validaciones/${id}`)
      .set(bearer(doc))
      .send({ estado: "VALIDADO", comentario: "Buen trabajo" });
    expect(r.status).toBe(200);
    expect(r.body.estadoValidacion).toBe("VALIDADO");

    const vista = await request(app).get(`/api/v1/proyectos/${id}`).set(bearer(est));
    expect(vista.body.estadoValidacion).toBe("VALIDADO");
    expect(vista.body.validacion.comentario).toBe("Buen trabajo");
  });

  it("rechazar exige comentario", async () => {
    const est = await estudiante("ana@gmail.com");
    const doc = await docente();
    const id = await proyecto(est);

    const sin = await request(app).post(`/api/v1/validaciones/${id}`).set(bearer(doc)).send({ estado: "RECHAZADO" });
    expect(sin.status).toBe(400);
    const con = await request(app)
      .post(`/api/v1/validaciones/${id}`)
      .set(bearer(doc))
      .send({ estado: "RECHAZADO", comentario: "Falta el README" });
    expect(con.status).toBe(200);
    expect(con.body.estadoValidacion).toBe("RECHAZADO");
  });

  it("409 si ya fue evaluado, 404 si no existe, 400 con datos inválidos", async () => {
    const est = await estudiante("ana@gmail.com");
    const doc = await docente();
    const id = await proyecto(est);
    await request(app).post(`/api/v1/validaciones/${id}`).set(bearer(doc)).send({ estado: "VALIDADO" });

    const otra = await request(app).post(`/api/v1/validaciones/${id}`).set(bearer(doc)).send({ estado: "VALIDADO" });
    expect(otra.status).toBe(409);
    expect((await request(app).post("/api/v1/validaciones/99999").set(bearer(doc)).send({ estado: "VALIDADO" })).status).toBe(404);
    expect((await request(app).post("/api/v1/validaciones/abc").set(bearer(doc)).send({ estado: "VALIDADO" })).status).toBe(400);
    expect((await request(app).post(`/api/v1/validaciones/${id}`).set(bearer(doc)).send({ estado: "PENDIENTE" })).status).toBe(400);
  });

  it("si el estudiante edita un proyecto rechazado, vuelve a pendiente y se borra el comentario", async () => {
    const est = await estudiante("ana@gmail.com");
    const doc = await docente();
    const id = await proyecto(est);
    await request(app)
      .post(`/api/v1/validaciones/${id}`)
      .set(bearer(doc))
      .send({ estado: "RECHAZADO", comentario: "Falta el README" });

    const put = await request(app)
      .put(`/api/v1/proyectos/${id}`)
      .set(bearer(est))
      .send({ urlDocumentacion: "https://github.com/ana/inventario#readme" });
    expect(put.body.estadoValidacion).toBe("PENDIENTE");
    expect(put.body.validacion).toBeNull();

    const lista = await request(app).get("/api/v1/validaciones/pendientes").set(bearer(doc));
    expect(lista.body.map((p: { id: number }) => p.id)).toContain(id);
  });
});