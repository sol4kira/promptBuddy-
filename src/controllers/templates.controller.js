import * as templateService from "../services/templateService.js";

export function getHealth(req, res) {
  res.status(200).json({ status: "ok" });
}

export async function getTemplates(req, res, next) {
  try {
    const { category } = req.query;
    const templates = await templateService.getAllTemplates(category);
    res.status(200).json({ templates });
  } catch (err) {
    next(err);
  }
}

export async function getTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const isValidId = /^[a-z0-9-]+$/.test(id);

    if (!isValidId) {
      return res.status(400).json({
        error: {
          status: 400,
          message: "Invalid template ID format. Only lowercase letters, digits, and hyphens are allowed."
        }
      });
    }

    const template = await templateService.getTemplateById(id);
    if (!template) {
      return res.status(404).json({
        error: {
          status: 404,
          message: "Template not found"
        }
      });
    }

    res.status(200).json({ template });
  } catch (err) {
    next(err);
  }
}
