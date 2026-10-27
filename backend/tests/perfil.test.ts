import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

const PERFIL = "/api/v1/perfil";
const datos = {
  nombre: "Ana Prueba",
  email: "ana.prueba@uls.edu.sv",
  password: "Clave12345",
  carnet: "PA-00001",
};

async function sesion() {
  const res = await request(app).post("/api/v1/auth/register").send(datos);
  return res.body.token as string;
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe("GET /perfil", () => {
  it("rechaza si no hay token (401)", async () => {
    const res = await request(app).get(PERFIL);
    expect(res.status).toBe(401);
  });

  it("rechaza a un usuario que no es estudiante (403)", async () => {
    await sesion();
    await prisma.user.update({ where: { email: datos.email }, data: { rol: "EMPRESA" } });
    // el rol viaja dentro del token: hay que iniciar sesión de nuevo para que cambie
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: datos.email, password: datos.password });
    const res = await request(app).get(PERFIL).set(auth(login.body.token));
    expect(res.status).toBe(403);
  });

  it("crea y devuelve un perfil vacío la primera vez", async () => {
    const token = await sesion();
    const res = await request(app).get(PERFIL).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.perfil).toMatchObject({
      carnet: "PA-00001",
      porcentajeAvance: 0,
      historialAcademico: null,
      disponibilidad: null,
      habilidades: [],
    });
    expect(res.body.perfil.userId).toBeUndefined();
  });
});

describe("PUT /perfil", () => {
  it("actualiza los datos y los conserva", async () => {
    const token = await sesion();
    const res = await request(app)
      .put(PERFIL)
      .set(auth(token))
      .send({
        porcentajeAvance: 60,
        historialAcademico: "Cursé Programación I y II",
        disponibilidad: "TIEMPO_PARCIAL",
      });
    expect(res.status).toBe(200);
    expect(res.body.perfil).toMatchObject({
      porcentajeAvance: 60,
      historialAcademico: "Cursé Programación I y II",
      disponibilidad: "TIEMPO_PARCIAL",
    });

    const otra = await request(app).get(PERFIL).set(auth(token));
    expect(otra.body.perfil.porcentajeAvance).toBe(60);
  });

  it("guarda habilidades escritas libremente y las normaliza", async () => {
    const token = await sesion();
    const res = await request(app)
      .put(PERFIL)
      .set(auth(token))
      .send({ habilidades: ["  Vue.js  ", "Node.js", "vue.js", "Base   de   datos"] });
    expect(res.status).toBe(200);
    expect(res.body.perfil.habilidades).toEqual(["Vue.js", "Node.js", "Base de datos"]);
  });

  it("reemplaza la lista de habilidades y permite vaciarla", async () => {
    const token = await sesion();

    const primera = await request(app)
      .put(PERFIL)
      .set(auth(token))
      .send({ habilidades: ["Vue.js", "Node.js"] });
    expect(primera.body.perfil.habilidades).toEqual(["Vue.js", "Node.js"]);

    const segunda = await request(app)
      .put(PERFIL)
      .set(auth(token))
      .send({ habilidades: ["PostgreSQL"] });
    expect(segunda.body.perfil.habilidades).toEqual(["PostgreSQL"]);

    const vacia = await request(app).put(PERFIL).set(auth(token)).send({ habilidades: [] });
    expect(vacia.body.perfil.habilidades).toEqual([]);
  });

  it("no toca las habilidades si no se envían", async () => {
    const token = await sesion();
    await request(app).put(PERFIL).set(auth(token)).send({ habilidades: ["Vue.js"] });
    const res = await request(app).put(PERFIL).set(auth(token)).send({ porcentajeAvance: 10 });
    expect(res.status).toBe(200);
    expect(res.body.perfil.habilidades).toEqual(["Vue.js"]);
    expect(res.body.perfil.porcentajeAvance).toBe(10);
  });

  it("ignora campos que ya no existen, como carrera", async () => {
    const token = await sesion();
    const res = await request(app)
      .put(PERFIL)
      .set(auth(token))
      .send({ carrera: "Medicina", porcentajeAvance: 5 });
    expect(res.status).toBe(200);
    expect(res.body.perfil.carrera).toBeUndefined();
    expect(res.body.perfil.porcentajeAvance).toBe(5);
  });

  it("rechaza un porcentaje fuera de rango (400)", async () => {
    const token = await sesion();
    const res = await request(app).put(PERFIL).set(auth(token)).send({ porcentajeAvance: 150 });
    expect(res.status).toBe(400);
    expect(res.body.detalles[0].campo).toBe("porcentajeAvance");
  });

  it("rechaza una habilidad vacía (400)", async () => {
    const token = await sesion();
    const res = await request(app).put(PERFIL).set(auth(token)).send({ habilidades: ["   "] });
    expect(res.status).toBe(400);
    expect(res.body.detalles[0].campo).toBe("habilidades.0");
  });

  it("rechaza más de 30 habilidades (400)", async () => {
    const token = await sesion();
    const muchas = Array.from({ length: 31 }, (_, i) => `Habilidad ${i}`);
    const res = await request(app).put(PERFIL).set(auth(token)).send({ habilidades: muchas });
    expect(res.status).toBe(400);
    expect(res.body.detalles[0].campo).toBe("habilidades");
  });

  it("rechaza una habilidad de más de 40 caracteres (400)", async () => {
    const token = await sesion();
    const res = await request(app)
      .put(PERFIL)
      .set(auth(token))
      .send({ habilidades: ["a".repeat(41)] });
    expect(res.status).toBe(400);
    expect(res.body.detalles[0].campo).toBe("habilidades.0");
  });

  it("rechaza un cuerpo vacío (400)", async () => {
    const token = await sesion();
    const res = await request(app).put(PERFIL).set(auth(token)).send({});
    expect(res.status).toBe(400);
  });
});

describe("PUT /perfil — carnet", () => {
  it("guarda el carnet normalizado (sin espacios y en mayúsculas) y lo conserva", async () => {
    const token = await sesion();
    const res = await request(app)
      .put(PERFIL)
      .set(auth(token))
      .send({ carnet: "  cs-2026-001 " });
    expect(res.status).toBe(200);
    expect(res.body.perfil.carnet).toBe("CS-2026-001");

    const otra = await request(app).get(PERFIL).set(auth(token));
    expect(otra.body.perfil.carnet).toBe("CS-2026-001");
  });

  it("no toca el carnet si no se envía", async () => {
    const token = await sesion();
    await request(app).put(PERFIL).set(auth(token)).send({ carnet: "CS-2026-001" });
    const res = await request(app).put(PERFIL).set(auth(token)).send({ porcentajeAvance: 20 });
    expect(res.status).toBe(200);
    expect(res.body.perfil.carnet).toBe("CS-2026-001");
    expect(res.body.perfil.porcentajeAvance).toBe(20);
  });

  it("permite volver a enviar el mismo carnet sin dar conflicto", async () => {
    const token = await sesion();
    await request(app).put(PERFIL).set(auth(token)).send({ carnet: "CS-2026-001" });
    const res = await request(app).put(PERFIL).set(auth(token)).send({ carnet: "CS-2026-001" });
    expect(res.status).toBe(200);
  });

  it("rechaza un carnet con formato inválido (400)", async () => {
    const token = await sesion();
    const res = await request(app).put(PERFIL).set(auth(token)).send({ carnet: "ab" });
    expect(res.status).toBe(400);
    expect(res.body.detalles[0].campo).toBe("carnet");
  });

  it("rechaza un carnet con caracteres no permitidos (400)", async () => {
    const token = await sesion();
    const res = await request(app).put(PERFIL).set(auth(token)).send({ carnet: "CS 2026/001!" });
    expect(res.status).toBe(400);
    expect(res.body.detalles[0].campo).toBe("carnet");
  });
});