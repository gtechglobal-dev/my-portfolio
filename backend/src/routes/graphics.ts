import { Router, Response } from "express";
import { v2 as cloudinary } from "cloudinary";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FOLDER = "gtech-portfolio/graphics";

const router = Router();

router.get("/", async (_req, res: Response) => {
  try {
    const result = await cloudinary.search
      .expression(`folder:${FOLDER}`)
      .sort_by("created_at", "desc")
      .max_results(100)
      .execute();

    const graphics = result.resources.map((r: any) => ({
      id: r.public_id,
      title: r.context?.title || r.filename || r.public_id.split("/").pop(),
      category: r.context?.category || "Other",
      description: r.context?.description || "",
      image: r.secure_url,
      color: r.context?.color || "#4f46e5",
      createdAt: r.created_at,
    }));

    res.json({ graphics });
  } catch (err: any) {
    console.error("Cloudinary search failed:", err.message);
    res.json({ graphics: [] });
  }
});

router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { title, category, description, image, color } = req.body;

  if (!title || !category || !image) {
    return res.status(400).json({ error: "Title, category, and image are required" });
  }

  const match = image.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) {
    return res.status(400).json({ error: "Invalid image format. Must be a base64 data URL." });
  }

  try {
    const uploadResult = await cloudinary.uploader.upload(image, {
      folder: FOLDER,
      context: `title=${title}|category=${category}|description=${description || ""}|color=${color || "#4f46e5"}`,
      tags: [category],
    });

    const design = {
      id: uploadResult.public_id,
      title,
      category,
      description: description || "",
      image: uploadResult.secure_url,
      color: color || "#4f46e5",
      createdAt: uploadResult.created_at,
    };

    res.json({ success: true, design });
  } catch (err: any) {
    console.error("Cloudinary upload failed:", err.message);
    res.status(500).json({ error: "Failed to upload image to cloud storage" });
  }
});

router.delete("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    await cloudinary.uploader.destroy(id);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Cloudinary delete failed:", err.message);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

export default router;
