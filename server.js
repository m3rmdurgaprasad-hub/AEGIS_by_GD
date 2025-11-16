// Minimal Node server to serve static files and send email on lockdown.
// 1) Put your SMTP credentials below.
//    - Example: Use a Gmail account with an App Password (recommended).
// 2) Run: npm install && npm start
// 3) Client will POST /lockdown, server sends email to the address below.

import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const port = 8080;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

// --- Configure SMTP transporter ---
const EMAIL_TO = "m3.rmdurgaprasad@gmail.com";

// Replace with your SMTP credentials:
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "yourgmail@example.com",
    pass: "your-app-password" // App Password, not your normal password
  }
});

async function sendLockdownEmail(payload) {
  const subject = `Aegis Protocol: LOCKDOWN initiated`;
  const text = `Lockdown was initiated by: ${payload?.by || "unknown"} at ${new Date().toLocaleString()}. Reason: ${payload?.reason || "N/A"}.`;
  const html = `<p><strong>LOCKDOWN INITIATED</strong></p>
                <p><strong>By:</strong> ${payload?.by || "unknown"}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Reason:</strong> ${payload?.reason || "N/A"}</p>`;
  return transporter.sendMail({
    from: '"Aegis Protocol" <yourgmail@example.com>',
    to: EMAIL_TO,
    subject,
    text,
    html
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const pathname = url.pathname;

  // Endpoint: POST /lockdown
  if (pathname === "/lockdown" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        await sendLockdownEmail(payload);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        console.error("Email send error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "EmailFailed" }));
      }
    });
    return;
  }

  // Static file serving
  let filePath = join(__dirname, pathname === "/" ? "/index.html" : pathname);
  const info = await stat(filePath).catch(() => null);
  if (!info) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }
  const type = mime[extname(filePath)] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
  createReadStream(filePath).pipe(res);
});

server.listen(port, () => {
  console.log(`Aegis Protocol running at http://localhost:${port}`);
});
