import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import { generate } from "otplib";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

const API = "/api/v1/auth";
const datos = { nombre: "Ana 2FA", email: "ana.2fa@uls.edu.sv", password: "Clave12345", carnet: "DP-00001" };
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

async function registrarYEntrar() {
  const r = await request(app).post(`${API}/register`).send(datos);
  return { token: r.body.token as string, id: r.body.user.id as number };
}

// Configura y activa la 2FA; devuelve el secreto
async function activar(token: string) {
  const conf = await request(app).post(`${API}/2fa/configurar`).set(bearer(token));
  const secreto = conf.body.secreto as string;
  const codigo = await generate({ secret: secreto });
  await request(app).post(`${API}/2fa/activar`).set(bearer(token)).send({ codigo });
  return { secreto };
}

async function loginConPaso(email = datos.email) {
  const r = await request(app).post(`${API}/login`).send({ email, password: datos.password });
  return r.body as { requiere2fa?: boolean; tokenTemporal?: string; token?: string };
}

beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("configurar y activar la 2FA", () => {
  it("configurar devuelve secreto, URL y QR, y no activa todavía", async () => {
    const est = await registrarYEntrar();
    const res = await request(app).post(`${API}/2fa/configurar`).set(bearer(est.token));
    expect(res.status).toBe(201);
    expect(res.body.secreto).toMatch(/^[A-Z2-7]+=*$/);
    expect(res.body.otpauthUrl.startsWith("otpauth://totp/")).toBe(true);
    expect(res.body.qr.startsWith("data:image/png;base64,")).toBe(true);
    expect((await prisma.user.findUnique({ where: { id: est.id } }))!.totpActivo).toBe(false);
  });

  it("el secreto se guarda cifrado, no en texto plano", async () => {
    const est = await registrarYEntrar();
    const conf = await request(app).post(`${API}/2fa/configurar`).set(bearer(est.token));
    const guardado = (await prisma.user.findUnique({ where: { id: est.id } }))!.totpSecretoCifrado!;
    expect(guardado).not.toContain(conf.body.secreto);
  });

  it("activar con un código incorrecto da 400; con el correcto la activa", async () => {
    const est = await registrarYEntrar();
    const conf = await request(app).post(`${API}/2fa/configurar`).set(bearer(est.token));

    const malo = await request(app).post(`${API}/2fa/activar`).set(bearer(est.token)).send({ codigo: "000000" });
    expect(malo.status).toBe(400);

    const codigo = await generate({ secret: conf.body.secreto });
    const ok = await request(app).post(`${API}/2fa/activar`).set(bearer(est.token)).send({ codigo });
    expect(ok.status).toBe(204);
    expect((await prisma.user.findUnique({ where: { id: est.id } }))!.totpActivo).toBe(true);
  });

  it("no se puede configurar dos veces una 2FA ya activa; 401 sin sesión", async () => {
    const est = await registrarYEntrar();
    await activar(est.token);
    expect((await request(app).post(`${API}/2fa/configurar`).set(bearer(est.token))).status).toBe(409);
    expect((await request(app).post(`${API}/2fa/configurar`)).status).toBe(401);
  });
});

describe("inicio de sesión en dos pasos", () => {
  it("sin 2FA el login sigue entregando el token directamente", async () => {
    await registrarYEntrar();
    const r = await loginConPaso();
    expect(r.requiere2fa).toBeUndefined();
    expect(r.token).toBeTruthy();
  });

  it("con 2FA el login pide el segundo paso y no da acceso", async () => {
    const est = await registrarYEntrar();
    await activar(est.token);
    const r = await loginConPaso();
    expect(r.requiere2fa).toBe(true);
    expect(r.token).toBeUndefined();
    // El token temporal no sirve para la API
    expect((await request(app).get(`${API}/me`).set(bearer(r.tokenTemporal!))).status).toBe(401);
  });

  it("verificar con el código de la app entrega el token de acceso", async () => {
    const est = await registrarYEntrar();
    const { secreto } = await activar(est.token);
    const paso1 = await loginConPaso();

    const codigo = await generate({ secret: secreto });
    const res = await request(app)
      .post(`${API}/2fa/verificar`)
      .send({ tokenTemporal: paso1.tokenTemporal, codigo });
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(est.id);
    expect((await request(app).get(`${API}/me`).set(bearer(res.body.token))).status).toBe(200);
  });

  it("un código incorrecto da 401", async () => {
    const est = await registrarYEntrar();
    await activar(est.token);
    const paso1 = await loginConPaso();
    const res = await request(app).post(`${API}/2fa/verificar`).send({ tokenTemporal: paso1.tokenTemporal, codigo: "000000" });
    expect(res.status).toBe(401);
  });

  it("el token temporal vence y no vale para otra cuenta", async () => {
    const res = await request(app).post(`${API}/2fa/verificar`).send({ tokenTemporal: "no-es-un-token", codigo: "123456" });
    expect(res.status).toBe(401);
  });
});

describe("desactivar la 2FA", () => {
  it("con un código válido se desactiva y el login vuelve a ser directo", async () => {
    const est = await registrarYEntrar();
    const { secreto } = await activar(est.token);

    const codigo = await generate({ secret: secreto });
    const res = await request(app).post(`${API}/2fa/desactivar`).set(bearer(est.token)).send({ codigo });
    expect(res.status).toBe(204);

    const r = await loginConPaso();
    expect(r.requiere2fa).toBeUndefined();
    expect(r.token).toBeTruthy();
  });

  it("con un código incorrecto no se desactiva", async () => {
    const est = await registrarYEntrar();
    await activar(est.token);
    const res = await request(app).post(`${API}/2fa/desactivar`).set(bearer(est.token)).send({ codigo: "000000" });
    expect(res.status).toBe(400);
    expect((await prisma.user.findUnique({ where: { id: est.id } }))!.totpActivo).toBe(true);
  });
});
