import "dotenv/config";

const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl) {
  throw new Error(
    "Falta DATABASE_URL_TEST (revisa tu .env; ver .env.example)",
  );
}

process.env.DATABASE_URL = testUrl;
process.env.JWT_SECRET = process.env.JWT_SECRET || "secreto-solo-para-pruebas";
process.env.LOGIN_MAX_INTENTOS = "100000";
process.env.CIFRADO_KEY = require("node:crypto").randomBytes(32).toString("base64");
