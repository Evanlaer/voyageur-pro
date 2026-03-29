import express from "express";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", resendConfigured: !!resend, pexelsConfigured: !!process.env.PEXELS_API_KEY });
  });

  // API route to proxy Pexels search
  app.get("/api/photos", async (req, res) => {
    const { query } = req.query;
    const apiKey = process.env.PEXELS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Pexels API key is not configured." });
    }

    if (!query) {
      return res.status(400).json({ error: "Query parameter is required." });
    }

    try {
      const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query as string)}&per_page=1`, {
        headers: {
          'Authorization': apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Pexels API error:", errorText);
        return res.status(response.status).json({ error: "Failed to fetch from Pexels" });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Server error fetching photos:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API route to send email
  app.post("/api/send-itinerary", async (req, res) => {
    const { email, itinerary, pptxBase64 } = req.body;

    if (!resend) {
      return res.status(500).json({ error: "Le service d'email n'est pas configuré (RESEND_API_KEY manquante)." });
    }

    if (!email || !itinerary) {
      return res.status(400).json({ error: "Email and itinerary are required" });
    }

    try {
      const attachments = [];
      if (pptxBase64) {
        attachments.push({
          filename: `Catalogue_${itinerary.destinationName.replace(/\s+/g, '_')}.pptx`,
          content: pptxBase64,
        });
      }

      const { data, error } = await resend.emails.send({
        from: "Voyageur Pro <onboarding@resend.dev>",
        to: [email],
        subject: `Votre catalogue PowerPoint pour ${itinerary.destinationName} !`,
        attachments,
        html: `
          <div style="font-family: serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
            <h1 style="color: ${itinerary.colorPalette.primary}; font-size: 32px;">${itinerary.destinationName}</h1>
            <p style="font-style: italic; font-size: 18px; color: #666;">Votre catalogue de voyage personnalisé est prêt !</p>
            <p>Veuillez trouver ci-joint le récapitulatif complet de votre aventure au format PowerPoint (.pptx).</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            
            <p style="margin-top: 40px; font-size: 12px; color: #999; text-align: center;">
              Généré par Voyageur Pro
            </p>
          </div>
        `,
      });

      if (error) {
        console.error("Resend error:", error);
        return res.status(400).json(error);
      }

      res.status(200).json(data);
    } catch (err) {
      console.error("Server error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
