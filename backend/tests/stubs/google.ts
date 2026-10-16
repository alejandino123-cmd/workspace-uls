import { jest } from "@jest/globals";

type GoogleIdentity = {
  sub: string;
  email: string;
  emailVerified: boolean;
  nombre: string;
};

// Sustituto de src/lib/google.ts durante los tests: nunca llama a Google.
export const verifyGoogleToken = jest.fn<(idToken: string) => Promise<GoogleIdentity>>();