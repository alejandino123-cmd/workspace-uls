// Punto único de registro de rutas: app.ts solo importa `apiRouter`.
import { Router } from "express";
import { pingRouter } from "./ping";
import { authRouter } from "./auth";
import { dosPasosRouter } from "./dosPasos";
import { perfilFotoRouter } from "./perfilFoto";
import { perfilCvRouter } from "./perfilCv";
import { perfilRouter } from "./perfil";
import { proyectosRouter } from "./proyectos";
import { usuariosRouter } from "./usuarios";
import { validacionesRouter } from "./validaciones";
import { perfilesRouter } from "./perfiles";
import { chatRouter } from "./chat";
import { catalogoRouter } from "./catalogo";

export const apiRouter = Router();

// El orden importa: /perfil/foto y /perfil/cv van antes que /perfil
apiRouter.use("/", pingRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/auth/2fa", dosPasosRouter);
apiRouter.use("/perfil/foto", perfilFotoRouter);
apiRouter.use("/perfil/cv", perfilCvRouter);
apiRouter.use("/perfil", perfilRouter);
apiRouter.use("/proyectos", proyectosRouter);
apiRouter.use("/usuarios", usuariosRouter);
apiRouter.use("/validaciones", validacionesRouter);
apiRouter.use("/perfiles", perfilesRouter);
apiRouter.use("/chat", chatRouter);
apiRouter.use("/catalogo", catalogoRouter);
