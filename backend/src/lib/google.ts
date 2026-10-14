import { OAuth2Client } from "google-auth-library";
import { config } from "../config";

const client = new OAuth2Client();

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  nombre: string;
}

export async function verifyGoogleToken(idToken: string): Promise<GoogleIdentity> {
  // Comprueba la firma de Google, que no esté vencido y que sea para NUESTRA app (audience)
  const ticket = await client.verifyIdToken({ idToken, audience: config.googleClientId });
  const p = ticket.getPayload();
  if (!p?.sub || !p.email) throw new Error("Token de Google sin datos de usuario");
  return {
    sub: p.sub,
    email: p.email.toLowerCase(),
    emailVerified: p.email_verified === true,
    nombre: p.name ?? p.email.split("@")[0],
  };
}