import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const notFoundHtmlPath = path.resolve(__dirname, "../../public/404.html");

export default function notFound(req, res, next) {
  if (req.originalUrl && req.originalUrl.startsWith("/api")) {
    return res.status(404).json({
      error: {
        status: 404,
        message: "Not found"
      }
    });
  }

  res.status(404).sendFile(notFoundHtmlPath);
}
