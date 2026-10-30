import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.resolve(__dirname, "../data/templates.json");

async function readTemplatesData() {
  const content = await fs.readFile(dataPath, "utf-8");
  return JSON.parse(content);
}

export async function getAllTemplates(category) {
  const templates = await readTemplatesData();
  if (!category) {
    return templates;
  }
  const targetCategory = category.trim().toLowerCase();
  return templates.filter(
    (t) => t.category && t.category.toLowerCase() === targetCategory
  );
}

export async function getTemplateById(id) {
  const templates = await readTemplatesData();
  const template = templates.find((t) => t.id === id);
  return template || null;
}
