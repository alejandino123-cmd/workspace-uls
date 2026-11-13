// Revisión de imágenes subidas (fotos de perfil y vistas previas de proyectos)

export const MAX_BYTES_IMAGEN = 2 * 1024 * 1024; // 2 MB

// El tipo que declara el navegador se puede falsificar: se revisan los primeros bytes del archivo
export function esImagenPermitida(b: Buffer): boolean {
  const jpg = b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png =
    b.length > 8 &&
    b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp =
    b.length > 12 &&
    b.subarray(0, 4).toString("ascii") === "RIFF" &&
    b.subarray(8, 12).toString("ascii") === "WEBP";
  return jpg || png || webp;
}
