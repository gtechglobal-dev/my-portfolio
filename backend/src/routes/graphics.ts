import { Router, Response } from "express";
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { readGraphics, writeGraphics } from "../db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = join(__dirname, "..", "..", "..", "frontend", "public", "uploads", "graphics");

if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

const router = Router();

router.get("/", (_req, res: Response) => {
  const graphics = readGraphics().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({ graphics });
});

router.post("/", authMiddleware, (req: AuthRequest, res: Response) => {
  const { title, category, description, image, color } = req.body;

  if (!title || !category || !image) {
    return res.status(400).json({ error: "Title, category, and image are required" });
  }

  const match = image.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) {
    return res.status(400).json({ error: "Invalid image format. Must be a base64 data URL." });
  }

  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  const filename = `${randomUUID()}.${ext}`;
  const filepath = join(UPLOAD_DIR, filename);

  writeFileSync(filepath, Buffer.from(match[2], "base64"));

  const graphics = readGraphics();
  const entry = {
    id: randomUUID(),
    title,
    category,
    description: description || "",
    image: `/uploads/graphics/${filename}`,
    color: color || "#4f46e5",
    createdAt: new Date().toISOString(),
  };

  graphics.push(entry);
  writeGraphics(graphics);

  res.json({ success: true, design: entry });
});

router.delete("/:id", authMiddleware, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const graphics = readGraphics();
  const idx = graphics.findIndex((g) => g.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: "Design not found" });
  }

  const removed = graphics[idx];
  const filepath = join(UPLOAD_DIR, removed.image.split("/").pop()!);
  if (existsSync(filepath)) {
    unlinkSync(filepath);
  }

  graphics.splice(idx, 1);
  writeGraphics(graphics);

  res.json({ success: true });
});

export default router;
