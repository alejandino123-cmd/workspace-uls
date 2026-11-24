import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

const API = "/api/v1";
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
const DIA = 24 * 60 * 60 * 1000;

let contador = 0;
const carnetNuevo = () => `HI-${String(++contador).padStart(5, "0")}`;

async function estudiante(email = "ana@uls.edu.sv") {
  const r = await request(app)
    .post(`${API}/auth/register`)
    .send({ nombre: "Ana López", email, password: "Clave12345", carnet: carnetNuevo() });
  return r.body.token as string;
}

async function coordinacion(email = "coord@uls.edu.sv") {
  await prisma.user.create({
    data: { email, nombre: "Coordinación", rol: "COORDINACION", passwordHash: await bcrypt.hash("Clave12345", 10) },
  });
  const r = await request(app).post(`${API}/auth/login`).send({ email, password: "Clave12345" });
  return r.body.token as string;
}

async function crearProyecto(token: string) {
  const r = await request(app)
    .post(`${API}/proyectos`)
    .set(bearer(token))
    .send({ titulo: "Sistema de inventario", descripcion: "App web para controlar inventario." });
  return r.body.id as number;
}

const rechazar = (coord: string, id: number, extra: object = {}) =>
  request(app)
    .post(`${API}/validaciones/${id}`)
    .set(bearer(coord))
    .send({ estado: "RECHAZADO", comentario: "Falta el README", ...extra });

beforeEach(async () => {
  await prisma.proyecto.deleteMany(); // cascada: validación e historial
  await prisma.perfilEstudiante.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("plazo de corrección de proyectos rechazados", () => {
  it("al rechazar fija la fecha límite (7 días por defecto) y el estudiante la ve", async () => {
    const est = await estudiante();
    const coord = await coordinacion();
    const id = await crearProyecto(est);

    const antes = Date.now();
    const r = await rechazar(coord, id);
    expect(r.status).toBe(200);

    const mio = await request(app).get(`${API}/proyectos/${id}`).set(bearer(est));
    const limite = new Date(mio.body.fechaLimiteCorreccion).getTime();
    expect(limite).toBeGreaterThanOrEqual(antes + 7 * DIA - 1000);
    expect(limite).toBeLessThanOrEqual(Date.now() + 7 * DIA + 1000);
  });

  it("acepta un plazo personalizado y valida su rango", async () => {
    const est = await estudiante();
    const coord = await coordinacion();
    const id = await crearProyecto(est);

    expect((await rechazar(coord, id, { plazoDias: 0 })).status).toBe(400);
    expect((await rechazar(coord, id, { plazoDias: 61 })).status).toBe(400);

    await rechazar(coord, id, { plazoDias: 3 });
    const p = await prisma.proyecto.findUniqueOrThrow({ where: { id } });
    const dias = (p.fechaLimiteCorreccion!.getTime() - Date.now()) / DIA;
    expect(dias).toBeGreaterThan(2.9);
    expect(dias).toBeLessThanOrEqual(3);
  });

  it("validar no deja fecha límite, y corregir la limpia", async () => {
    const est = await estudiante();
    const coord = await coordinacion();
    const id = await crearProyecto(est);
    await rechazar(coord, id);

    const corregido = await request(app).put(`${API}/proyectos/${id}`).set(bearer(est)).send({ titulo: "Inventario v2" });
    expect(corregido.body.estadoValidacion).toBe("PENDIENTE");
    expect(corregido.body.fechaLimiteCorreccion).toBeNull();

    await request(app).post(`${API}/validaciones/${id}`).set(bearer(coord)).send({ estado: "VALIDADO" });
    const p = await prisma.proyecto.findUniqueOrThrow({ where: { id } });
    expect(p.fechaLimiteCorreccion).toBeNull();
  });

  it("lista los rechazados y marca los vencidos", async () => {
    const est = await estudiante();
    const coord = await coordinacion();
    const a = await crearProyecto(est);
    const b = await crearProyecto(est);
    await rechazar(coord, a);
    await rechazar(coord, b, { plazoDias: 2 });
    await prisma.proyecto.update({ where: { id: a }, data: { fechaLimiteCorreccion: new Date(Date.now() - DIA) } });

    const r = await request(app).get(`${API}/validaciones/rechazados`).set(bearer(coord));
    expect(r.status).toBe(200);
    expect(r.body.map((p: { id: number }) => p.id)).toEqual([a, b]); // el plazo más próximo primero
    expect(r.body[0].vencido).toBe(true);
    expect(r.body[1].vencido).toBe(false);
    expect(r.body[0].estudiante.nombre).toBe("Ana López");

    expect((await request(app).get(`${API}/validaciones/rechazados`).set(bearer(est))).status).toBe(403);
  });
});

describe("línea de tiempo del proyecto", () => {
  it("registra creación, rechazo, corrección, validación y publicación en orden", async () => {
    const est = await estudiante();
    const coord = await coordinacion();
    const id = await crearProyecto(est);

    await rechazar(coord, id, { plazoDias: 5 });
    await request(app).put(`${API}/proyectos/${id}`).set(bearer(est)).send({ descripcion: "Ahora con README y pruebas." });
    await request(app).post(`${API}/validaciones/${id}`).set(bearer(coord)).send({ estado: "VALIDADO", comentario: "Bien" });
    await prisma.perfilEstudiante.updateMany({
      data: { fotoUrl: "https://res.cloudinary.com/demo/f.jpg", biografia: "Hola", habilidades: ["Vue"] },
    });
    await request(app).put(`${API}/proyectos/${id}`).set(bearer(est)).send({ publicado: true });

    const r = await request(app).get(`${API}/validaciones/proyectos/${id}/historial`).set(bearer(coord));
    expect(r.status).toBe(200);
    expect(r.body.map((e: { evento: string }) => e.evento)).toEqual([
      "CREADO",
      "RECHAZADO",
      "CORREGIDO",
      "VALIDADO",
      "PUBLICADO",
    ]);
    const rechazo = r.body[1];
    expect(rechazo.comentario).toBe("Falta el README");
    expect(rechazo.fechaLimite).not.toBeNull();
    expect(rechazo.actor.rol).toBe("COORDINACION");
    expect(r.body[2].fueraDePlazo).toBe(false);
    expect(r.body[2].actor.rol).toBe("ESTUDIANTE");
  });

  it("marca la corrección enviada fuera de plazo", async () => {
    const est = await estudiante();
    const coord = await coordinacion();
    const id = await crearProyecto(est);
    await rechazar(coord, id);
    await prisma.proyecto.update({ where: { id }, data: { fechaLimiteCorreccion: new Date(Date.now() - DIA) } });

    await request(app).put(`${API}/proyectos/${id}`).set(bearer(est)).send({ titulo: "Tarde pero seguro" });
    const r = await request(app).get(`${API}/validaciones/proyectos/${id}/historial`).set(bearer(coord));
    const correccion = r.body.find((e: { evento: string }) => e.evento === "CORREGIDO");
    expect(correccion.fueraDePlazo).toBe(true);
  });

  it("editar un proyecto que no estaba rechazado se registra como EDITADO", async () => {
    const est = await estudiante();
    const coord = await coordinacion();
    const id = await crearProyecto(est);
    await request(app).put(`${API}/proyectos/${id}`).set(bearer(est)).send({ titulo: "Nuevo título" });

    const r = await request(app).get(`${API}/validaciones/proyectos/${id}/historial`).set(bearer(coord));
    expect(r.body.map((e: { evento: string }) => e.evento)).toEqual(["CREADO", "EDITADO"]);
  });

  it("404 si el proyecto no existe y 403 para estudiantes", async () => {
    const est = await estudiante();
    const coord = await coordinacion();
    expect((await request(app).get(`${API}/validaciones/proyectos/99999/historial`).set(bearer(coord))).status).toBe(404);
    const id = await crearProyecto(est);
    expect((await request(app).get(`${API}/validaciones/proyectos/${id}/historial`).set(bearer(est))).status).toBe(403);
  });
});
