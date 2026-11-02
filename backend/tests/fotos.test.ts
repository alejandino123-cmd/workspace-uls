import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import fs from "node:fs";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { rutaImagen } from "../src/lib/imagenes";

const API = "/api/v1";
const FIRMA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const png = (extra = 100) => Buffer.concat([FIRMA_PNG, Buffer.alloc(extra, 1)]);

let contadorCarnet = 0;
async function estudiante(email: string) {
  const r = await request(app)
    .post(`${API}/auth/register`)
    .send({
      nombre: "Ana Foto",
      email,
      password: "Clave12345",
      carnet: `FT-${String(++contadorCarnet).padStart(5, "0")}`,
    });
  return { token: r.body.token as string, id: r.body.user.id as number };
}

const subir = (token: string, buffer: Buffer, nombre = "foto.png", tipo = "image/png") =>
  request(app)
    .put(`${API}/fotos`)
    .set("Authorization", `Bearer ${token}`)
    .attach("foto", buffer, { filename: nombre, contentType: tipo });

beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("PUT /fotos (subir foto de perfil)", () => {
  it("401 sin sesión", async () => {
    const res = await request(app).put(`${API}/fotos`).attach("foto", png(), "foto.png");
    expect(res.status).toBe(401);
  });

  it("guarda la imagen y la sirve con su tipo", async () => {
    const est = await estudiante("ana@uls.edu.sv");
    const res = await subir(est.token, png());
    expect(res.status).toBe(200);
    expect(res.body.fotoUrl).toBe(`/api/v1/fotos/${est.id}`);

    const ver = await request(app).get(`/api/v1/fotos/${est.id}`);
    expect(ver.status).toBe(200);
    expect(ver.headers["content-type"]).toBe("image/png");
    expect(ver.headers["x-content-type-options"]).toBe("nosniff");
    expect(ver.body.length).toBe(png().length);
  });

  it("rechaza un archivo que no es imagen aunque se llame .png", async () => {
    const est = await estudiante("ana@uls.edu.sv");
    const res = await subir(est.token, Buffer.from("esto es texto, no una imagen"));
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("JPG, PNG o WEBP");
  });

  it("acepta JPG y WEBP por su firma", async () => {
    const est = await estudiante("ana@uls.edu.sv");
    const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(50)]);
    expect((await subir(est.token, jpg, "a.jpg", "image/jpeg")).status).toBe(200);
    const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(20)]);
    expect((await subir(est.token, webp, "a.webp", "image/webp")).status).toBe(200);
    const ver = await request(app).get(`/api/v1/fotos/${est.id}`);
    expect(ver.headers["content-type"]).toBe("image/webp");
  });

  it("413 si la imagen supera 2 MB", async () => {
    const est = await estudiante("ana@uls.edu.sv");
    const res = await subir(est.token, png(2 * 1024 * 1024));
    expect(res.status).toBe(413);
  });

  it("400 si no se envía ningún archivo", async () => {
    const est = await estudiante("ana@uls.edu.sv");
    const res = await request(app).put(`${API}/fotos`).set("Authorization", `Bearer ${est.token}`);
    expect(res.status).toBe(400);
  });

  it("al reemplazar la foto borra el archivo anterior", async () => {
    const est = await estudiante("ana@uls.edu.sv");
    await subir(est.token, png(10));
    const anterior = (await prisma.user.findUnique({ where: { id: est.id } }))!.fotoArchivo!;
    expect(fs.existsSync(rutaImagen(anterior))).toBe(true);

    await subir(est.token, png(20));
    expect(fs.existsSync(rutaImagen(anterior))).toBe(false);
    const nueva = (await prisma.user.findUnique({ where: { id: est.id } }))!.fotoArchivo!;
    expect(nueva).not.toBe(anterior);
  });
});

describe("DELETE /fotos y GET /fotos/:userId", () => {
  it("quita la foto y después responde 404", async () => {
    const est = await estudiante("ana@uls.edu.sv");
    await subir(est.token, png());
    const borrado = await request(app).delete(`${API}/fotos`).set("Authorization", `Bearer ${est.token}`);
    expect(borrado.status).toBe(204);
    expect((await request(app).get(`${API}/fotos/${est.id}`)).status).toBe(404);
  });

  it("404 si el usuario no tiene foto; 400 con id inválido", async () => {
    const est = await estudiante("ana@uls.edu.sv");
    expect((await request(app).get(`${API}/fotos/${est.id}`)).status).toBe(404);
    expect((await request(app).get(`${API}/fotos/abc`)).status).toBe(400);
  });
});
