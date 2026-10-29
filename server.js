// server.js
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Handle POST to save prompt
  if (req.method === "POST" && req.url === "/save-prompt") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { prompt } = JSON.parse(body || "{}");
        if (!prompt) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing prompt in body" }));
          return;
        }
        const timestamp = new Date().toISOString();
        const entry = `[${timestamp}]\n${prompt}\n----------------------------------------\n\n`;
        fs.appendFile(path.join(__dirname, "prompts.txt"), entry, (err) => {
          if (err) {
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Error saving file");
            return;
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, message: "Prompt saved successfully!" }));
        });
      } catch (e) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Bad Request: " + e.message);
      }
    });
    return;
  }

  // Static file serving
  if (req.method === "GET") {
    let reqUrl = req.url.split("?")[0];
    if (reqUrl === "/" || reqUrl === "") {
      reqUrl = "/index.html";
    }

    const filePath = path.join(__dirname, reqUrl);
    if (!filePath.startsWith(__dirname)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    fs.readFile(filePath, (err, data) => {
      if (err) {
        if (err.code === "ENOENT") {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("File not found");
        } else {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Server Error");
        }
        return;
      }
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    });
    return;
  }

  res.writeHead(405, { "Content-Type": "text/plain" });
  res.end("Method Not Allowed");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`PromptBuddy server running at http://localhost:${PORT}`));
