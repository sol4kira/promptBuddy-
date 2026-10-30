import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import templatesRoutes from "./routes/templates.routes.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");

const app = express();

app.use(express.json());
app.use(express.static(publicDir));

// API Routes
app.use("/api", templatesRoutes);

// 404 handler
app.use(notFound);

// Centralized error handler
app.use(errorHandler);

export default app;
