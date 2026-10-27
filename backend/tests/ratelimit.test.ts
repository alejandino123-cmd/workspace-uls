import { describe, it, expect } from "@jest/globals";
import express from "express";
import request from "supertest";
import { crearLimitador, claveCorreo } from "../src/lib/rate-limit";

// App mínima con el límite real por correo+IP, con 2 intentos para que la prueba sea corta
function appConLimite() {
  const app = express();
  app.use(express.json());
  app.post("/login", crearLimitador(claveCorreo, 2), (_req, res) => res.status(401).json({ error: "no" }));
  return app;
}

describe("límite de intentos fallidos por correo+IP", () => {
  it("bloquea la misma cuenta desde la misma IP tras agotar los intentos", async () => {
    const app = appConLimite();
    const datos = { email: "ana@uls.edu.sv" };
    expect((await request(app).post("/login").send(datos)).status).toBe(401);
    expect((await request(app).post("/login").send(datos)).status).toBe(401);
    const bloqueado = await request(app).post("/login").send(datos);
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.body.error).toContain("Demasiados intentos");
  });

  it("no bloquea a otra cuenta desde la misma IP", async () => {
    const app = appConLimite();
    await request(app).post("/login").send({ email: "ana@uls.edu.sv" });
    await request(app).post("/login").send({ email: "ana@uls.edu.sv" });
    expect((await request(app).post("/login").send({ email: "beto@uls.edu.sv" })).status).toBe(401);
  });

  it("ignora mayúsculas y espacios en el correo al contar", async () => {
    const app = appConLimite();
    await request(app).post("/login").send({ email: "ana@uls.edu.sv" });
    await request(app).post("/login").send({ email: " ANA@uls.edu.sv " });
    expect((await request(app).post("/login").send({ email: "Ana@ULS.edu.sv" })).status).toBe(429);
  });

  it("no cuenta los inicios de sesión correctos", async () => {
    const app = express();
    app.post("/login", crearLimitador(claveCorreo, 1), (_req, res) => res.status(200).json({ ok: true }));
    expect((await request(app).post("/login").send({ email: "a@uls.edu.sv" })).status).toBe(200);
    expect((await request(app).post("/login").send({ email: "a@uls.edu.sv" })).status).toBe(200);
    expect((await request(app).post("/login").send({ email: "a@uls.edu.sv" })).status).toBe(200);
  });
});
