import { describe, it, expect, beforeEach, afterAll, jest } from "@jest/globals";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

// Nombres de los campos de PUT /auth/password (según passwordSchema en auth.ts)
const CAMPO_ACTUAL = "actual";
const CAMPO_NUEVA = "nueva";


const API = "/api/v1";

async function limpiarBD() {
  await prisma.validacionProyecto.deleteMany();
  await prisma.proyecto.deleteMany();
  await prisma.perfilEstudiante.deleteMany();
  await prisma.user.deleteMany();
}

// Cada estudiante necesita un carnet único
let contadorCarnet = 0;
const carnetNuevo = () => `CU-${String(++contadorCarnet).padStart(5, "0")}`;

async function registrar(email: string, password = "Password123") {
  return request(app)
    .post(`${API}/auth/register`)
    .send({ nombre: "Ana Prueba", email, password, carnet: carnetNuevo() });
}

async function login(email: string, password: string) {
  return request(app).post(`${API}/auth/login`).send({ email, password });
}

async function crearCoordinador() {
  await prisma.user.create({
    data: {
      nombre: "Coord",
      email: "coord@uls.edu.sv",
      passwordHash: bcrypt.hashSync("Coord12345", 10),
      rol: "COORDINACION",
    },
  });
  const res = await login("coord@uls.edu.sv", "Coord12345");
  return res.body.token as string;
}

beforeEach(async () => {
  await limpiarBD();
});

describe("PUT /auth/password", () => {
  const cambiar = (token: string, actual: string, nueva: string) =>
    request(app)
      .put(`${API}/auth/password`)
      .set("Authorization", `Bearer ${token}`)
      .send({ [CAMPO_ACTUAL]: actual, [CAMPO_NUEVA]: nueva });

  it("401 sin token", async () => {
    const res = await request(app)
      .put(`${API}/auth/password`)
      .send({ [CAMPO_ACTUAL]: "a", [CAMPO_NUEVA]: "b" });
    expect(res.status).toBe(401);
  });

  it("204 y la nueva contraseña reemplaza a la anterior", async () => {
    const reg = await registrar("ana@uls.edu.sv");
    const res = await cambiar(reg.body.token, "Password123", "NuevaClave456");
    expect(res.status).toBe(204);

    expect((await login("ana@uls.edu.sv", "NuevaClave456")).status).toBe(200);
    expect((await login("ana@uls.edu.sv", "Password123")).status).toBe(401);
  });

  it("400 si la contraseña actual es incorrecta", async () => {
    const reg = await registrar("ana@uls.edu.sv");
    const res = await cambiar(reg.body.token, "Equivocada1", "NuevaClave456");
    expect(res.status).toBe(400);
  });

  it("400 si la nueva es igual a la actual", async () => {
    const reg = await registrar("ana@uls.edu.sv");
    const res = await cambiar(reg.body.token, "Password123", "Password123");
    expect(res.status).toBe(400);
  });

  it("400 si la nueva es demasiado corta", async () => {
    const reg = await registrar("ana@uls.edu.sv");
    const res = await cambiar(reg.body.token, "Password123", "corta");
    expect(res.status).toBe(400);
  });
});

describe("POST /usuarios (solo COORDINACION)", () => {
  const crear = (token: string | null, body: object) => {
    const r = request(app).post(`${API}/usuarios`);
    if (token) r.set("Authorization", `Bearer ${token}`);
    return r.send(body);
  };
  const docente = {
    nombre: "Empresa Uno",
    email: "empresa@uls.edu.sv",
    password: "Profe12345",
    rol: "EMPRESA", // se puede crear EMPRESA o COORDINACION, no ESTUDIANTE
  };

  it("401 sin token", async () => {
    expect((await crear(null, docente)).status).toBe(401);
  });

  it("403 si quien llama es ESTUDIANTE", async () => {
    const reg = await registrar("est@uls.edu.sv");
    expect((await crear(reg.body.token, docente)).status).toBe(403);
  });

  it("201 crea una EMPRESA que puede iniciar sesión", async () => {
    const token = await crearCoordinador();
    const res = await crear(token, docente);
    expect(res.status).toBe(201);
    expect(res.body.user.rol).toBe("EMPRESA");
    expect(res.body.user.passwordHash).toBeUndefined();

    const l = await login(docente.email, docente.password);
    expect(l.status).toBe(200);
    expect(l.body.user.rol).toBe("EMPRESA");
  });

  it("201 crea una cuenta EMPRESA", async () => {
    const token = await crearCoordinador();
    const res = await crear(token, {
      ...docente,
      email: "rrhh@empresa.com",
      rol: "EMPRESA",
    });
    expect(res.status).toBe(201);
    expect(res.body.user.rol).toBe("EMPRESA");
  });

  it("400 si intenta crear un ESTUDIANTE o un DOCENTE por esta vía", async () => {
  const token = await crearCoordinador();
  for (const rol of ["ESTUDIANTE", "DOCENTE"]) {
    const res = await crear(token, { ...docente, rol });
    expect(res.status).toBe(400);
  }
});

it("201 crea otra cuenta COORDINACION", async () => {
  const token = await crearCoordinador();
  const res = await crear(token, {
    ...docente,
    email: "otra.coordinacion@ejemplo.com",
    rol: "COORDINACION",
  });
  expect(res.status).toBe(201);
  expect(res.body.user.rol).toBe("COORDINACION");
  expect(res.body.user.passwordHash).toBeUndefined();
});

  it("400 si la contraseña es muy corta", async () => {
    const token = await crearCoordinador();
    const res = await crear(token, { ...docente, password: "123" });
    expect(res.status).toBe(400);
  });
});
afterAll(async () => {
  await prisma.$disconnect();
});