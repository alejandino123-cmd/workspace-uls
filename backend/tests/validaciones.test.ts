import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

const API = "/api/v1";
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

// Cada estudiante necesita un carnet único. Se genera uno nuevo en cada registro.
let contador = 0;
const carnetNuevo = () => `CA-${String(++contador).padStart(5, "0")}`;

async function estudiante(email: string, nombre = "Ana López") {
  const carnet = carnetNuevo();
  const r = await request(app)
    .post(`${API}/auth/register`)
    .send({ nombre, email, password: "Clave12345", carnet });
  return { token: r.body.token as string, id: r.body.user.id as number, carnet };
}

async function cuenta(rol: "COORDINACION" | "EMPRESA", email: string) {
  await prisma.user.create({
    data: { email, nombre: `Cuenta ${rol}`, rol, passwordHash: await bcrypt.hash("Clave12345", 10) },
  });
  const r = await request(app).post(`${API}/auth/login`).send({ email, password: "Clave12345" });
  return { token: r.body.token as string, id: r.body.user.id as number };
}

const coordinacion = (email = "coord@uls.edu.sv") => cuenta("COORDINACION", email);

async function proyecto(token: string, titulo = "Sistema de inventario") {
  const r = await request(app)
    .post(`${API}/proyectos`)
    .set(bearer(token))
    .send({ titulo, descripcion: "App web para controlar inventario." });
  return r.body.id as number;
}

beforeEach(async () => {
  await prisma.validacionProyecto.deleteMany();
  await prisma.proyecto.deleteMany();
  await prisma.perfilEstudiante.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("validación de proyectos por coordinación", () => {
  it("401 sin token; 403 para estudiante y para empresa", async () => {
    expect((await request(app).get(`${API}/validaciones/pendientes`)).status).toBe(401);

    const est = await estudiante("ana@uls.edu.sv");
    const id = await proyecto(est.token);
    const emp = await cuenta("EMPRESA", "rrhh@empresa.com");

    for (const t of [est.token, emp.token]) {
      expect((await request(app).get(`${API}/validaciones/pendientes`).set(bearer(t))).status).toBe(403);
      const r = await request(app).post(`${API}/validaciones/${id}`).set(bearer(t)).send({ estado: "VALIDADO" });
      expect(r.status).toBe(403);
    }
  });

  it("coordinación ve el portafolio completo de un estudiante y cualquier proyecto", async () => {
    const est = await estudiante("ana@uls.edu.sv");
    const coord = await coordinacion();
    const a = await proyecto(est.token, "Proyecto A");
    await proyecto(est.token, "Proyecto B");
    await request(app).post(`${API}/validaciones/${a}`).set(bearer(coord.token)).send({ estado: "VALIDADO" });

    const lista = await request(app)
      .get(`${API}/validaciones/estudiantes/${est.id}/proyectos`)
      .set(bearer(coord.token));
    expect(lista.status).toBe(200);
    expect(lista.body.proyectos).toHaveLength(2); // en cualquier estado
    expect(lista.body.estudiante.carnet).toBe(est.carnet);

    const uno = await request(app).get(`${API}/validaciones/proyectos/${a}`).set(bearer(coord.token));
    expect(uno.status).toBe(200);
    expect(uno.body.estudiante.email).toBe("ana@uls.edu.sv");
    expect(uno.body.estudiante.carnet).toBe(est.carnet);

    expect((await request(app).get(`${API}/validaciones/proyectos/99999`).set(bearer(coord.token))).status).toBe(404);
    expect((await request(app).get(`${API}/validaciones/proyectos/${a}`).set(bearer(est.token))).status).toBe(403);
  });

  it("lista solo pendientes, con los datos y el carnet del estudiante", async () => {
    const est = await estudiante("ana@uls.edu.sv");
    const coord = await coordinacion();
    const a = await proyecto(est.token, "Proyecto A");
    await proyecto(est.token, "Proyecto B");
    await request(app).post(`${API}/validaciones/${a}`).set(bearer(coord.token)).send({ estado: "VALIDADO" });

    const r = await request(app).get(`${API}/validaciones/pendientes`).set(bearer(coord.token));
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(1);
    expect(r.body[0].titulo).toBe("Proyecto B");
    expect(r.body[0].estudiante.email).toBe("ana@uls.edu.sv");
    expect(r.body[0].estudiante.carnet).toBe(est.carnet);
  });

  it("valida y el estudiante ve el estado y el comentario", async () => {
    const est = await estudiante("ana@uls.edu.sv");
    const coord = await coordinacion();
    const id = await proyecto(est.token);

    const r = await request(app)
      .post(`${API}/validaciones/${id}`)
      .set(bearer(coord.token))
      .send({ estado: "VALIDADO", comentario: "Buen trabajo" });
    expect(r.status).toBe(200);
    expect(r.body.estadoValidacion).toBe("VALIDADO");

    const vista = await request(app).get(`${API}/proyectos/${id}`).set(bearer(est.token));
    expect(vista.body.estadoValidacion).toBe("VALIDADO");
    expect(vista.body.validacion.comentario).toBe("Buen trabajo");
  });

  it("rechazar exige comentario", async () => {
    const est = await estudiante("ana@uls.edu.sv");
    const coord = await coordinacion();
    const id = await proyecto(est.token);

    const sin = await request(app)
      .post(`${API}/validaciones/${id}`)
      .set(bearer(coord.token))
      .send({ estado: "RECHAZADO" });
    expect(sin.status).toBe(400);

    const con = await request(app)
      .post(`${API}/validaciones/${id}`)
      .set(bearer(coord.token))
      .send({ estado: "RECHAZADO", comentario: "Falta el README" });
    expect(con.status).toBe(200);
    expect(con.body.estadoValidacion).toBe("RECHAZADO");
  });

  it("409 si ya fue evaluado, 404 si no existe, 400 con datos inválidos", async () => {
    const est = await estudiante("ana@uls.edu.sv");
    const coord = await coordinacion();
    const id = await proyecto(est.token);
    const evaluar = (ruta: string | number, body: object) =>
      request(app).post(`${API}/validaciones/${ruta}`).set(bearer(coord.token)).send(body);

    await evaluar(id, { estado: "VALIDADO" });
    expect((await evaluar(id, { estado: "VALIDADO" })).status).toBe(409);
    expect((await evaluar(99999, { estado: "VALIDADO" })).status).toBe(404);
    expect((await evaluar("abc", { estado: "VALIDADO" })).status).toBe(400);
    expect((await evaluar(id, { estado: "PENDIENTE" })).status).toBe(400);
  });

  it("si el estudiante edita un proyecto rechazado, vuelve a pendiente y se borra el comentario", async () => {
    const est = await estudiante("ana@uls.edu.sv");
    const coord = await coordinacion();
    const id = await proyecto(est.token);
    await request(app)
      .post(`${API}/validaciones/${id}`)
      .set(bearer(coord.token))
      .send({ estado: "RECHAZADO", comentario: "Falta el README" });

    const put = await request(app)
      .put(`${API}/proyectos/${id}`)
      .set(bearer(est.token))
      .send({ urlDocumentacion: "https://github.com/ana/inventario#readme" });
    expect(put.body.estadoValidacion).toBe("PENDIENTE");
    expect(put.body.validacion).toBeNull();

    const lista = await request(app).get(`${API}/validaciones/pendientes`).set(bearer(coord.token));
    expect(lista.body.map((p: { id: number }) => p.id)).toContain(id);
  });
});

describe("búsqueda y perfil de estudiantes (coordinación)", () => {
  it("403 para estudiante y empresa; 401 sin token", async () => {
    const est = await estudiante("ana@uls.edu.sv");
    const emp = await cuenta("EMPRESA", "rrhh@empresa.com");
    expect((await request(app).get(`${API}/validaciones/estudiantes`)).status).toBe(401);
    for (const t of [est.token, emp.token]) {
      expect((await request(app).get(`${API}/validaciones/estudiantes`).set(bearer(t))).status).toBe(403);
      expect((await request(app).get(`${API}/validaciones/estudiantes/${est.id}`).set(bearer(t))).status).toBe(403);
    }
  });

  it("busca por nombre, correo y carnet, y solo devuelve estudiantes", async () => {
    const ana = await estudiante("ana@uls.edu.sv", "Ana López");
    await estudiante("carlos@uls.edu.sv", "Carlos Mejía");
    await estudiante("beltran@uls.edu.sv", "Ana Beltrán");
    const coord = await coordinacion();
    const buscar = (q: string) =>
      request(app).get(`${API}/validaciones/estudiantes`).query({ buscar: q }).set(bearer(coord.token));

    // nombre parcial, sin distinguir mayúsculas
    const porNombre = await buscar("ANA");
    expect(porNombre.status).toBe(200);
    expect(porNombre.body.total).toBe(2);

    // correo
    expect((await buscar("carlos@uls.edu.sv")).body.total).toBe(1);

    // carnet exacto (también en minúsculas)
    const porCarnet = await buscar(ana.carnet.toLowerCase());
    expect(porCarnet.body.total).toBe(1);
    expect(porCarnet.body.estudiantes[0].id).toBe(ana.id);
    expect(porCarnet.body.estudiantes[0].carnet).toBe(ana.carnet);

    // el carnet no admite coincidencia parcial
    expect((await buscar(ana.carnet.slice(0, -1))).body.total).toBe(0);

    // sin buscar: lista a los 3 estudiantes, no a la coordinación
    const todos = await request(app).get(`${API}/validaciones/estudiantes`).set(bearer(coord.token));
    expect(todos.body.total).toBe(3);
  });

  it("pagina los resultados y rechaza límites inválidos", async () => {
    await estudiante("a@uls.edu.sv", "Ana Uno");
    await estudiante("b@uls.edu.sv", "Beto Dos");
    await estudiante("c@uls.edu.sv", "Cami Tres");
    const coord = await coordinacion();

    const p2 = await request(app)
      .get(`${API}/validaciones/estudiantes`)
      .query({ limit: 2, page: 2 })
      .set(bearer(coord.token));
    expect(p2.status).toBe(200);
    expect(p2.body.total).toBe(3);
    expect(p2.body.estudiantes).toHaveLength(1);

    const malo = await request(app)
      .get(`${API}/validaciones/estudiantes`)
      .query({ limit: 500 })
      .set(bearer(coord.token));
    expect(malo.status).toBe(400);
  });

  it("muestra el perfil completo con el conteo de proyectos por estado", async () => {
    const est = await estudiante("ana@uls.edu.sv");
    const coord = await coordinacion();
    await prisma.perfilEstudiante.update({
      where: { userId: est.id },
      data: { historialAcademico: "30 materias aprobadas", porcentajeAvance: 60, habilidades: ["Node"] },
    });
    const a = await proyecto(est.token, "Proyecto A");
    await proyecto(est.token, "Proyecto B");
    await request(app).post(`${API}/validaciones/${a}`).set(bearer(coord.token)).send({ estado: "VALIDADO" });

    const r = await request(app).get(`${API}/validaciones/estudiantes/${est.id}`).set(bearer(coord.token));
    expect(r.status).toBe(200);
    expect(r.body.estudiante.email).toBe("ana@uls.edu.sv");
    expect(r.body.perfil.carnet).toBe(est.carnet);
    expect(r.body.perfil.historialAcademico).toBe("30 materias aprobadas");
    expect(r.body.perfil.porcentajeAvance).toBe(60);
    expect(r.body.perfil.habilidades).toEqual(["Node"]);
    expect(r.body.proyectos).toEqual({ PENDIENTE: 1, VALIDADO: 1, RECHAZADO: 0 });
  });

  it("un estudiante sin perfil devuelve valores vacíos; 404 y 400 para ids inválidos", async () => {
    const coord = await coordinacion();
    const sinPerfil = await prisma.user.create({
      data: { email: "nuevo@uls.edu.sv", nombre: "Sin Perfil" },
    });

    const r = await request(app).get(`${API}/validaciones/estudiantes/${sinPerfil.id}`).set(bearer(coord.token));
    expect(r.status).toBe(200);
    expect(r.body.perfil.carnet).toBeNull();
    expect(r.body.proyectos).toEqual({ PENDIENTE: 0, VALIDADO: 0, RECHAZADO: 0 });

    // la coordinación no es un estudiante
    expect((await request(app).get(`${API}/validaciones/estudiantes/${coord.id}`).set(bearer(coord.token))).status).toBe(404);
    expect((await request(app).get(`${API}/validaciones/estudiantes/99999`).set(bearer(coord.token))).status).toBe(404);
    expect((await request(app).get(`${API}/validaciones/estudiantes/abc`).set(bearer(coord.token))).status).toBe(400);
  });
});
describe("GET /validaciones/validados", () => {
  it("lista solo proyectos validados, con los datos del estudiante y de la validación", async () => {
    const coord = await coordinacion();
    const ana = await estudiante("ana@uls.edu.sv", "Ana López");
    const beto = await estudiante("beto@uls.edu.sv", "Beto Mejía");
    const validado = await proyecto(ana.token, "Proyecto validado");
    await proyecto(beto.token, "Proyecto pendiente");
    await request(app)
      .post(`${API}/validaciones/${validado}`)
      .set(bearer(coord.token))
      .send({ estado: "VALIDADO", comentario: "Bien hecho" });

    const r = await request(app).get(`${API}/validaciones/validados`).set(bearer(coord.token));
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(1);
    expect(r.body[0]).toMatchObject({
      titulo: "Proyecto validado",
      estadoValidacion: "VALIDADO",
      validacion: { comentario: "Bien hecho" },
      estudiante: { id: ana.id, nombre: "Ana López", email: "ana@uls.edu.sv", carnet: ana.carnet },
    });
  });

  it("403 para estudiante y 401 sin sesión", async () => {
    const ana = await estudiante("ana@uls.edu.sv");
    expect((await request(app).get(`${API}/validaciones/validados`).set(bearer(ana.token))).status).toBe(403);
    expect((await request(app).get(`${API}/validaciones/validados`)).status).toBe(401);
  });
});
