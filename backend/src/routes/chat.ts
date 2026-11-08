import { Router } from "express";
import { askChatbot } from "../controllers/chatController";

export const chatRouter = Router();

chatRouter.post("/", askChatbot);