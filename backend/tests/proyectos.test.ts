import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

// Cada estudiante necesita un carnet único
let contador = 0;
const carnetNuevo = () => `PR-${String(++contador).padStart(5, "0")}`;

async function registrar(email: string) {
  await request(app)
    .post("/api/v1/auth/register")
    .send({ email, password: "Clave12345", nombre: "Test", carnet: carnetNuevo() });
  const r = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password: "Clave12345" });
  return r.body.token as string;
}

// Cuentas anteriores a la regla de carnet obligatorio: se crean directamente en la BD
async function registrarSinCarnet(email: string) {
  await prisma.user.create({
    data: { email, nombre: "Test", passwordHash: bcrypt.hashSync("Clave12345", 10) },
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
  token = await registrar("ana@uls.edu.sv");
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
    const sinCarnet = await registrarSinCarnet("sin@uls.edu.sv");
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
    const sinCarnet = await registrarSinCarnet("sin@uls.edu.sv");
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
    const otro = await registrar("beto@uls.edu.sv");
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
    const otro = { Authorization: `Bearer ${await registrar("beto@uls.edu.sv")}` };
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

describe("publicado en el portafolio", () => {
  it("nace no publicado y publicarlo no devuelve el proyecto a revisión", async () => {
    const h = { Authorization: `Bearer ${token}` };
    const creado = await request(app).post("/api/v1/proyectos").set(h).send(valido);
    expect(creado.body.publicado).toBe(false);
    const id = creado.body.id as number;
    await prisma.proyecto.update({ where: { id }, data: { estadoValidacion: "VALIDADO" } });

    const publicado = await request(app).put(`/api/v1/proyectos/${id}`).set(h).send({ publicado: true });
    expect(publicado.status).toBe(200);
    expect(publicado.body.publicado).toBe(true);
    expect(publicado.body.estadoValidacion).toBe("VALIDADO");

    // Editar el contenido sí lo devuelve a PENDIENTE
    const editado = await request(app).put(`/api/v1/proyectos/${id}`).set(h).send({ titulo: "Otro título" });
    expect(editado.body.estadoValidacion).toBe("PENDIENTE");
  });

  it("rechaza un valor no booleano en publicado (400)", async () => {
    const h = { Authorization: `Bearer ${token}` };
    const res = await request(app).post("/api/v1/proyectos").set(h).send({ ...valido, publicado: "si" });
    expect(res.status).toBe(400);
    expect(res.body.detalles[0].campo).toBe("publicado");
  });
});
