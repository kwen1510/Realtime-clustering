import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import FormData from "form-data";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { Groq } from "groq-sdk";
import { CLUSTER_MODEL_ID, PROMPT_TEMPLATE } from "./public/config.js";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(publicDir));

app.get("/favicon.ico", (_req, res) => {
  res.status(204).end();
});

app.get("/.well-known/appspecific/com.chrome.devtools.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Security-Policy", "default-src 'self'; connect-src 'self'");
  res.send('{}\n');
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "student.html"));
});

app.get("/console", (_req, res) => {
  res.sendFile(path.join(publicDir, "teacher.html"));
});

const upload = multer({ storage: multer.memoryStorage() });

/** Public config for the browser (safe to expose the anon key) */
app.get("/config", (_req, res) => {
  res.json({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
  });
});

/** Cluster all responses via Groq (Qwen3-32B) */
app.post("/api/cluster", async (req, res) => {
  const { responses } = req.body || {};
  if (!Array.isArray(responses)) return res.status(400).json({ error: "responses[] required" });

  const numbered = responses.map((t, i) => `${i}. ${t}`);
  const prompt = `${PROMPT_TEMPLATE}\n\nRESPONSES:\n${numbered.join("\n")}`.trim();

  const selection = { name: CLUSTER_MODEL_ID, temperature: 0, reasoning_effort: "none" };

  try {
    const completion = await groq.chat.completions.create({
      model: selection.name,
      temperature: selection.temperature,
      max_completion_tokens: 8192,
      top_p: 1,
      stream: false,
      reasoning_effort: selection.reasoning_effort,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You cluster short student answers. Respond strictly with JSON that matches the provided schema."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const content = completion.choices?.[0]?.message?.content;
    console.log('[Groq][cluster] prompt ->', prompt);
    console.log('[Groq][cluster] response ->', content);
    if (!content) {
      return res.status(502).json({ error: "Model returned no content." });
    }

    let out;
    try {
      out = JSON.parse(content);
    } catch (err) {
      return res.status(500).json({ error: "Model did not return valid JSON." });
    }

    const clusters = Array.isArray(out?.clusters)
      ? out.clusters.map(cluster => {
          const rawIndices = Array.isArray(cluster.indices)
            ? cluster.indices
            : typeof cluster.indices === "string"
              ? cluster.indices.split("")
              : [];
          const indices = rawIndices
            .map(value => {
              if (Number.isInteger(value)) return value;
              const num = parseInt(String(value), 10);
              return Number.isFinite(num) ? num : null;
            })
            .filter(value => value !== null);
          return {
            title: typeof cluster.title === "string" ? cluster.title : "Untitled cluster",
            indices
          };
        })
      : [];

    return res.json({ model: CLUSTER_MODEL_ID, prompt, clusters });
  } catch (err) {
    console.error("Groq clustering error", err);
    const status = err?.status || 500;
    return res.status(status).json({ error: err?.message || "Clustering call failed." });
  }
});

/** Transcribe teacher audio with Whisper Large v3 Turbo (multipart upload) */
app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "audio file required (field name: audio)" });

  const form = new FormData();
  form.append("file", req.file.buffer, {
    filename: req.file.originalname || "audio.webm",
    contentType: req.file.mimetype || "audio/webm"
  });
  form.append("model", "whisper-large-v3-turbo");
  form.append("language", "en");

  const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, ...form.getHeaders() },
    body: form
  });

  const j = await r.json();
  if (!r.ok) return res.status(r.status).json(j);
  res.json({ transcript: j.text || "" });
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server listening on http://localhost:${process.env.PORT || 3000}`);
});
