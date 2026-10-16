import "dotenv/config";

const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl) {
  throw new Error(
    "DATABASE_URL_TEST: \"postgresql://workspace:lavables@localhost:5432/workspace_test\"",
  );
}

process.env.DATABASE_URL = testUrl;
process.env.JWT_SECRET = process.env.JWT_SECRET || "secreto-solo-para-pruebas";
process.env.GOOGLE_CLIENT_ID = "test-client-id";