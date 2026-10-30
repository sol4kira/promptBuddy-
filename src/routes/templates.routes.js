import { Router } from "express";
import {
  getHealth,
  getTemplates,
  getTemplate
} from "../controllers/templates.controller.js";

const router = Router();

router.get("/health", getHealth);
router.get("/templates", getTemplates);
router.get("/templates/:id", getTemplate);

export default router;
