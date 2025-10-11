// server.js
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = http.createServer((req, res) => {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
  return;
  }

  // serve HTML
  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    fs.readFile(path.join(__dirname, "index.html"), (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end("Error loading HTML");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(data);
    });
  }

  // serve JS
  else if (req.method === "GET" && req.url === "/script.js") {
    fs.readFile(path.join(__dirname, "script.js"), (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end("Error loading JS");
        return;
      }
      res.writeHead(200, { "Content-Type": "application/javascript" });
      res.end(data);
    });
  }


  // serve CSS
else if (req.method === "GET" && req.url === "/style.css") {
  fs.readFile(path.join(__dirname, "style.css"), (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end("Error loading CSS");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/css" });
    res.end(data);
  });
}

  // handle POST to save prompt
  else if (req.method === "POST" && req.url === "/save-prompt") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      try {
        const { prompt } = JSON.parse(body);
        fs.appendFile(
          path.join(__dirname, "prompts.txt"),
          prompt + "\n\n",
          err => {
            if (err) {
              res.writeHead(500, { "Content-Type": "text/plain" });
              res.end("Error saving file");
              return;
            }
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("Prompt saved successfully!");
          }
        );
      } catch (e) {
        res.writeHead(400);
        res.end("Bad Request: " + e.message);
      }
    });
  }

  // fallback
  else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(3000, () => console.log("✅ Server running on http://localhost:3000"));

