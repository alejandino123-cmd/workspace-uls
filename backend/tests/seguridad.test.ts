import { describe, it, expect, afterEach } from "@jest/globals";
import express from "express";
import request from "supertest";
import { cabecerasSeguridad, protegerDocs } from "../src/middleware/seguridad";

function appDocs() {
  const app = express();
  app.get("/openapi.json", protegerDocs, (_req, res) => res.json({ ok: true }));
  return app;
}

const basic = (u: string, p: string) => `Basic ${Buffer.from(`${u}:${p}`).toString("base64")}`;
const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe("protección de la documentación", () => {
  it("pide credenciales cuando están configuradas", async () => {
    process.env.DOCS_USUARIO = "docs";
    process.env.DOCS_PASSWORD = "secreta";
    const sin = await request(appDocs()).get("/openapi.json");
    expect(sin.status).toBe(401);
    expect(sin.headers["www-authenticate"]).toContain("Basic");

    const mal = await request(appDocs()).get("/openapi.json").set("Authorization", basic("docs", "otra"));
    expect(mal.status).toBe(401);

    const bien = await request(appDocs()).get("/openapi.json").set("Authorization", basic("docs", "secreta"));
    expect(bien.status).toBe(200);
  });

  it("sin credenciales configuradas: abierta en desarrollo, oculta en producción", async () => {
    delete process.env.DOCS_USUARIO;
    delete process.env.DOCS_PASSWORD;
    process.env.NODE_ENV = "development";
    expect((await request(appDocs()).get("/openapi.json")).status).toBe(200);
    process.env.NODE_ENV = "production";
    expect((await request(appDocs()).get("/openapi.json")).status).toBe(404);
  });
});

describe("cabeceras de seguridad", () => {
  it("agrega las cabeceras básicas", async () => {
    const app = express();
    app.use(cabecerasSeguridad);
    app.get("/", (_req, res) => res.json({}));
    const r = await request(app).get("/");
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
    expect(r.headers["x-frame-options"]).toBe("DENY");
    expect(r.headers["referrer-policy"]).toBe("no-referrer");
  });
});
