import { describe, it, expect, beforeEach, afterAll, jest } from "@jest/globals";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { verifyGoogleToken } from "../src/lib/google";

// Google se simula con tests/stubs/google.ts (mapeado en jest.config.js)
const verifyMock = jest.mocked(verifyGoogleToken);
// Nombres de los campos de PUT /auth/password (según passwordSchema en auth.ts)
const CAMPO_ACTUAL = "actual";
const CAMPO_NUEVA = "nueva";

// googleSchema exige idToken de al menos 20 caracteres
const TOKEN = "token-de-google-de-prueba-123";

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

// hd es el dominio de Google Workspace de la cuenta (null = cuenta personal)
function googleOk(sub: string, email: string, nombre = "Gina Google", hd: string | null = "uls.edu.sv") {
  verifyMock.mockResolvedValue({
    sub,
    email,
    emailVerified: true,
    nombre,
    hd,
  });
}

beforeEach(async () => {
  await limpiarBD();
  verifyMock.mockReset();
});

describe("POST /auth/google", () => {
  it("400 si falta el idToken", async () => {
    const res = await request(app).post(`${API}/auth/google`).send({});
    expect(res.status).toBe(400);
  });

  it("400 si el idToken es demasiado corto", async () => {
    const res = await request(app)
      .post(`${API}/auth/google`)
      .send({ idToken: "corto" });
    expect(res.status).toBe(400);
  });

  it("401 si el token de Google es inválido", async () => {
    verifyMock.mockRejectedValue(new Error("invalid"));
    const res = await request(app)
      .post(`${API}/auth/google`)
      .send({ idToken: TOKEN });
    expect(res.status).toBe(401);
  });

  it("401 si el correo de Google no está verificado", async () => {
    verifyMock.mockResolvedValue({
      sub: "g-1",
      email: "x@uls.edu.sv",
      emailVerified: false,
      nombre: "X",
      hd: "uls.edu.sv",
    });
    const res = await request(app)
      .post(`${API}/auth/google`)
      .send({ idToken: TOKEN });
    expect(res.status).toBe(401);
  });

  it("403 CORREO_NO_INSTITUCIONAL si una cuenta nueva usa un correo personal", async () => {
    googleOk("g-p", "persona@gmail.com", "Persona", null);
    const res = await request(app)
      .post(`${API}/auth/google`)
      .send({ idToken: TOKEN, carnet: "GP-00001" });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("CORREO_NO_INSTITUCIONAL");
    expect(await prisma.user.count()).toBe(0);
  });

  it("403 si el correo es institucional pero la cuenta no es de Google Workspace del dominio", async () => {
    googleOk("g-h", "gina@uls.edu.sv", "Gina", "otro-dominio.com");
    const res = await request(app)
      .post(`${API}/auth/google`)
      .send({ idToken: TOKEN, carnet: "GH-00001" });
    expect(res.status).toBe(403);
    expect(await prisma.user.count()).toBe(0);
  });

  it("400 CARNET_REQUERIDO si una cuenta nueva no envía carnet", async () => {
    googleOk("g-c", "sin.carnet@uls.edu.sv");
    const res = await request(app).post(`${API}/auth/google`).send({ idToken: TOKEN });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("CARNET_REQUERIDO");
    expect(await prisma.user.count()).toBe(0);
  });

  it("409 si el carnet de una cuenta nueva ya lo tiene otro estudiante", async () => {
    await registrar("otro@uls.edu.sv"); // usa un carnet generado automáticamente
    const ocupado = (await prisma.perfilEstudiante.findFirst())!.carnet!;
    googleOk("g-d", "nuevo@uls.edu.sv");
    const res = await request(app).post(`${API}/auth/google`).send({ idToken: TOKEN, carnet: ocupado });
    expect(res.status).toBe(409);
  });

  it("crea un ESTUDIANTE nuevo con carnet (201) y luego inicia sesión (200)", async () => {
    googleOk("g-1", "gina@uls.edu.sv");

    const primera = await request(app)
      .post(`${API}/auth/google`)
      .send({ idToken: TOKEN, carnet: "GI-00001" });
    expect(primera.status).toBe(201);
    const perfil = await prisma.perfilEstudiante.findUnique({ where: { userId: primera.body.user.id } });
    expect(perfil?.carnet).toBe("GI-00001");
    expect(primera.status).toBe(201);
    expect(primera.body.user.rol).toBe("ESTUDIANTE");
    expect(primera.body.user.email).toBe("gina@uls.edu.sv");
    expect(primera.body.token).toBeTruthy();
    expect(primera.body.user.passwordHash).toBeUndefined();

    const segunda = await request(app)
      .post(`${API}/auth/google`)
      .send({ idToken: TOKEN });
    expect(segunda.status).toBe(200);
    expect(segunda.body.user.id).toBe(primera.body.user.id);
  });

  it("vincula una cuenta existente por correo verificado, sin duplicar", async () => {
    const reg = await registrar("laura@uls.edu.sv");
    expect(reg.status).toBe(201);

    googleOk("g-2", "laura@uls.edu.sv");
    const res = await request(app)
      .post(`${API}/auth/google`)
      .send({ idToken: TOKEN });

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(reg.body.user.id);
    expect(await prisma.user.count()).toBe(1);

    // La contraseña original sigue funcionando
    const l = await login("laura@uls.edu.sv", "Password123");
    expect(l.status).toBe(200);
  });
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

  it("400 para una cuenta creada solo con Google (sin contraseña)", async () => {
    googleOk("g-9", "solo@uls.edu.sv");
    const g = await request(app)
      .post(`${API}/auth/google`)
      .send({ idToken: TOKEN, carnet: "SG-00001" });
    const res = await cambiar(g.body.token, "loquesea", "NuevaClave456");
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
    rol: "EMPRESA", // se puede crear EMPRESA o DOCENTE, no ESTUDIANTE ni COORDINACION
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