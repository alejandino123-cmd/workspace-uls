import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const nombre = process.env.ADMIN_NOMBRE?.trim() || "Coordinación";

  if (!email || !password || password.length < 8) {
    throw new Error("Define ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 8 caracteres) en el .env");
  }

  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    console.log(`Ya existe un usuario con ${email} (rol ${existente.rol}). No se hizo nada.`);
    return;
  }

  await prisma.user.create({
    data: { email, nombre, rol: "COORDINACION", passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log(`Cuenta COORDINACION creada: ${email}`);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());