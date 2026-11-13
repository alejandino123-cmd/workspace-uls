import { v2 as cloudinary } from "cloudinary";
import { config } from "../config";

// Cloudinary es opcional: sin las tres variables, la subida de fotos responde 503
// y el resto de la API funciona igual (mismo criterio que el inicio de sesión con Google).
export function cloudinaryConfigurado(): boolean {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  return Boolean(cloudName && apiKey && apiSecret);
}

function configurar() {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

/**
 * Sube una foto de perfil. Se guarda ya recortada a 400x400 (centrada en el rostro
 * si lo detecta) y con calidad automática, así que ocupa poco espacio.
 * El public_id lleva la fecha para que el navegador no use una versión en caché
 * cuando el estudiante cambia de foto.
 */
export function subirFoto(buffer: Buffer, userId: number): Promise<{ url: string; publicId: string }> {
  configurar();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: `workspace-uls/perfiles/usuario-${userId}-${Date.now()}`,
        resource_type: "image",
        allowed_formats: ["jpg", "png", "webp"],
        transformation: [
          { width: 400, height: 400, crop: "fill", gravity: "face" },
          { quality: "auto" },
        ],
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Cloudinary no devolvió resultado"));
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

/** Sube la vista previa de un proyecto. Se recorta a 16:9 (1200x675) para las tarjetas. */
export function subirImagenProyecto(buffer: Buffer, proyectoId: number): Promise<{ url: string; publicId: string }> {
  configurar();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: `workspace-uls/proyectos/proyecto-${proyectoId}-${Date.now()}`,
        resource_type: "image",
        allowed_formats: ["jpg", "png", "webp"],
        transformation: [
          { width: 1200, height: 675, crop: "fill", gravity: "auto" },
          { quality: "auto" },
        ],
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Cloudinary no devolvió resultado"));
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

/** Borra una foto anterior. Si Cloudinary no está configurado, no hace nada. */
export async function borrarFoto(publicId: string): Promise<void> {
  if (!cloudinaryConfigurado()) return;
  configurar();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
}

/** Sube el currículum (PDF). Se guarda como archivo "raw" para que Cloudinary no intente procesarlo como imagen. */
export function subirCv(buffer: Buffer, userId: number): Promise<{ url: string; publicId: string }> {
  configurar();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: `workspace-uls/cv/usuario-${userId}-${Date.now()}.pdf`,
        resource_type: "raw",
        format: "pdf",
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Cloudinary no devolvió resultado"));
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

/** Borra un currículum anterior. */
export async function borrarCv(publicId: string): Promise<void> {
  if (!cloudinaryConfigurado()) return;
  configurar();
  await cloudinary.uploader.destroy(publicId, { resource_type: "raw", invalidate: true });
}
