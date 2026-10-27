import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const API = "/api/v1/auth";
const datos = {
  nombre: "Ana Prueba",
  email: "ana.prueba@uls.edu.sv",
  password: "Clave12345",
  carnet: "AP-00001",
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

  it("exige el carnet (400)", async () => {
    const { carnet: _sinCarnet, ...sinCarnet } = datos;
    const res = await request(app).post(`${API}/register`).send(sinCarnet);
    expect(res.status).toBe(400);
    expect(res.body.detalles.map((d: { campo: string }) => d.campo)).toContain("carnet");
  });

  it("exige correo institucional (400)", async () => {
    const res = await request(app)
      .post(`${API}/register`)
      .send({ ...datos, email: "ana@gmail.com" });
    expect(res.status).toBe(400);
    expect(res.body.detalles[0].campo).toBe("email");
    expect(res.body.detalles[0].mensaje).toContain("@uls.edu.sv");
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

describe("sesiones", () => {
  it("cambiar la contraseña invalida el token anterior", async () => {
    const reg = await registrar();
    const h = { Authorization: `Bearer ${reg.token}` };

    const cambio = await request(app)
      .put(`${API}/password`)
      .set(h)
      .send({ actual: datos.password, nueva: "OtraClave123" });
    expect(cambio.status).toBe(204);

    expect((await request(app).get(`${API}/me`).set(h)).status).toBe(401);
    const login = await request(app).post(`${API}/login`).send({ email: datos.email, password: "OtraClave123" });
    expect(login.status).toBe(200);
    const nuevo = await request(app).get(`${API}/me`).set({ Authorization: `Bearer ${login.body.token}` });
    expect(nuevo.status).toBe(200);
  });

  it("un token vigente deja de dar acceso si el rol cambia a uno sin permiso", async () => {
    await prisma.user.create({
      data: { email: "coord@uls.edu.sv", nombre: "Coord", rol: "COORDINACION", passwordHash: bcrypt.hashSync("Coord12345", 10) },
    });
    const login = await request(app).post(`${API}/login`).send({ email: "coord@uls.edu.sv", password: "Coord12345" });
    const h = { Authorization: `Bearer ${login.body.token}` };
    expect((await request(app).get("/api/v1/usuarios").set(h)).status).not.toBe(403);

    await prisma.user.update({ where: { email: "coord@uls.edu.sv" }, data: { rol: "ESTUDIANTE" } });
    // El token aún no ha expirado, pero el rol se consulta en la base de datos
    expect((await request(app).post("/api/v1/usuarios").set(h).send({})).status).toBe(403);
  });
});

