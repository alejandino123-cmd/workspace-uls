import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

const API = "/api/v1";
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

function registrar(email: string, carnet = "ZZ-00009") {
  return request(app)
    .post(`${API}/auth/register`)
    .send({ nombre: "Test", email, password: "Clave12345", carnet });
}

beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("carnet del estudiante", () => {
  it("se registra con carnet y se guarda normalizado en mayúsculas", async () => {
    const reg = await registrar("ana@uls.edu.sv", "ab-12345");
    expect(reg.status).toBe(201);

    const r = await request(app).get(`${API}/perfil`).set(bearer(reg.body.token));
    expect(r.body.perfil.carnet).toBe("AB-12345");
  });

  it("400 si el registro no trae carnet (es obligatorio)", async () => {
    const res = await request(app)
      .post(`${API}/auth/register`)
      .send({ nombre: "Test", email: "ana@uls.edu.sv", password: "Clave12345" });
    expect(res.status).toBe(400);
    expect(res.body.detalles[0].campo).toBe("carnet");
    expect(await prisma.user.count()).toBe(0);
  });

  it("409 si el carnet ya lo tiene otro estudiante (sin distinguir mayúsculas)", async () => {
    await registrar("ana@uls.edu.sv", "AB-12345");
    const dup = await registrar("beto@uls.edu.sv", "ab-12345");
    expect(dup.status).toBe(409);
    expect(await prisma.user.count()).toBe(1);
  });

  it("400 con un carnet de formato inválido", async () => {
    expect((await registrar("a@uls.edu.sv", "ab")).status).toBe(400);
    expect((await registrar("b@uls.edu.sv", "AB 12345")).status).toBe(400);
    expect(await prisma.user.count()).toBe(0);
  });

  it("PUT /perfil cambia el carnet; reenviar el propio no da conflicto", async () => {
    const reg = await registrar("ana@uls.edu.sv", "AA-00001");
    const h = bearer(reg.body.token);

    const a = await request(app).put(`${API}/perfil`).set(h).send({ carnet: "AB-12345" });
    expect(a.status).toBe(200);
    expect(a.body.perfil.carnet).toBe("AB-12345");

    const b = await request(app).put(`${API}/perfil`).set(h).send({ carnet: "AB-12345" });
    expect(b.status).toBe(200);
  });

  it("PUT /perfil: 409 con el carnet de otro y 400 al intentar borrarlo", async () => {
    await registrar("ana@uls.edu.sv", "AB-12345");
    const beto = await registrar("beto@uls.edu.sv", "BE-00001");
    const h = bearer(beto.body.token);

    expect((await request(app).put(`${API}/perfil`).set(h).send({ carnet: "AB-12345" })).status).toBe(409);
    expect((await request(app).put(`${API}/perfil`).set(h).send({ carnet: null })).status).toBe(400);
  });

  it("el perfil público nunca expone el carnet", async () => {
    const reg = await registrar("ana@uls.edu.sv", "AB-12345");
    const r = await request(app).get(`${API}/perfiles/${reg.body.user.id}`);
    expect(r.status).toBe(200);
    expect(JSON.stringify(r.body)).not.toContain("AB-12345");
  });
});