import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

const API = "/api/v1/auth";
const datos = {
  nombre: "Ana Prueba",
  email: "ana.prueba@ejemplo.com",
  password: "Clave12345",
};

async function registrar() {
  const res = await request(app).post(`${API}/register`).send(datos);
  return res.body as { user: { id: number }; token: string };
}

beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe("POST /auth/register", () => {
  it("crea un estudiante y devuelve user y token", async () => {
    const res = await request(app).post(`${API}/register`).send(datos);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      email: datos.email,
      nombre: datos.nombre,
      rol: "ESTUDIANTE",
    });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(typeof res.body.token).toBe("string");
  });

  it("guarda la contraseña cifrada, no en texto plano", async () => {
    await request(app).post(`${API}/register`).send(datos);
    const guardado = await prisma.user.findUnique({ where: { email: datos.email } });
    expect(guardado?.passwordHash).not.toBe(datos.password);
    expect(guardado?.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it("ignora el rol enviado por el cliente", async () => {
    const res = await request(app)
      .post(`${API}/register`)
      .send({ ...datos, rol: "DOCENTE" });
    expect(res.status).toBe(201);
    expect(res.body.user.rol).toBe("ESTUDIANTE");
  });

  it("rechaza un correo ya registrado (409)", async () => {
    await registrar();
    const res = await request(app).post(`${API}/register`).send(datos);
    expect(res.status).toBe(409);
  });

  it("rechaza una contraseña corta (400)", async () => {
    const res = await request(app)
      .post(`${API}/register`)
      .send({ ...datos, password: "123" });
    expect(res.status).toBe(400);
    expect(res.body.detalles[0].campo).toBe("password");
  });
});

describe("POST /auth/login", () => {
  it("inicia sesión con credenciales correctas", async () => {
    await registrar();
    const res = await request(app)
      .post(`${API}/login`)
      .send({ email: datos.email, password: datos.password });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(datos.email);
    expect(typeof res.body.token).toBe("string");
  });

  it("rechaza una contraseña incorrecta (401)", async () => {
    await registrar();
    const res = await request(app)
      .post(`${API}/login`)
      .send({ email: datos.email, password: "OtraClave999" });
    expect(res.status).toBe(401);
  });

  it("da el mismo mensaje si el correo no existe", async () => {
    await registrar();
    const mala = await request(app)
      .post(`${API}/login`)
      .send({ email: datos.email, password: "OtraClave999" });
    const inexistente = await request(app)
      .post(`${API}/login`)
      .send({ email: "nadie@ejemplo.com", password: "Clave12345" });
    expect(inexistente.status).toBe(401);
    expect(inexistente.body.error).toBe(mala.body.error);
  });

  it("rechaza datos inválidos (400)", async () => {
    const res = await request(app).post(`${API}/login`).send({ email: "no-es-correo" });
    expect(res.status).toBe(400);
  });
});

describe("GET /auth/me", () => {
  it("devuelve el usuario con un token válido", async () => {
    const { token } = await registrar();
    const res = await request(app)
      .get(`${API}/me`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(datos.email);
  });

  it("rechaza si no hay token (401)", async () => {
    const res = await request(app).get(`${API}/me`);
    expect(res.status).toBe(401);
  });

  it("rechaza un token falso (401)", async () => {
    const res = await request(app)
      .get(`${API}/me`)
      .set("Authorization", "Bearer abc");
    expect(res.status).toBe(401);
  });

  it("rechaza el token de un usuario que ya no existe (401)", async () => {
    const { token } = await registrar();
    await prisma.user.deleteMany();
    const res = await request(app)
      .get(`${API}/me`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});