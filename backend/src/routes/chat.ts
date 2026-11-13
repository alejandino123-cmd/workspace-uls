import { Router } from "express";
import { askChatbot } from "../controllers/chatController";
import { limitarChatbot } from "../lib/rate-limit";

export const chatRouter = Router();

chatRouter.post("/", limitarChatbot, askChatbot);