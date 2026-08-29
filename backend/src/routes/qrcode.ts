import { Router, Response } from "express";
import { randomBytes } from "crypto";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import {
  readBooks,
  findBook,
  writeBook,
  deleteBook,
  readQrCodes,
  findQrCode,
  writeQrCode,
  activateQrCode,
  deleteQrCodesByBook,
  type Book,
  type QrCode,
} from "../db.js";

const router = Router();

const BASE_URL =
  process.env.QR_BASE_URL ||
  process.env.FRONTEND_URL ||
  "https://gtechglobal.dev";

function toShortCode(title: string): string {
  const clean = title
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);
  return clean || Math.random().toString(36).slice(2, 7).toUpperCase();
}

function makeToken(): string {
  return randomBytes(12).toString("hex");
}

// ─── Register a book (admin) ───────────────────────────────

router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, author, isbn, publisher, year, edition, description, category } = req.body;

    if (!title || !author) {
      return res.status(400).json({ error: "Title and author are required" });
    }

    const book: Book = {
      id: uuidv4(),
      title: title.trim(),
      author: author.trim(),
      isbn: isbn?.trim() || "",
      publisher: publisher?.trim() || "Okson Publishers",
      year: year?.trim() || "",
      edition: edition?.trim() || "",
      description: description?.trim() || "",
      category: category?.trim() || "General",
      createdAt: new Date().toISOString(),
    };

    await writeBook(book);
    res.json({ success: true, book });
  } catch (err: any) {
    console.error("Register book failed:", err.message);
    res.status(500).json({ error: "Failed to register book" });
  }
});

// ─── List books (admin) ────────────────────────────────────

router.get("/", authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const books = await readBooks();
    res.json({ books });
  } catch (err: any) {
    console.error("List books failed:", err.message);
    res.status(500).json({ error: "Failed to load books" });
  }
});

// ─── Delete a book + its codes (admin) ─────────────────────

router.delete("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await deleteBook(id);
    await deleteQrCodesByBook(id);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Delete book failed:", err.message);
    res.status(500).json({ error: "Failed to delete book" });
  }
});

// ─── Generate serial QR codes for a book (admin) ───────────

router.post("/:id/generate", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const count = Math.max(1, Math.min(parseInt(req.body.count, 10) || 1, 500));

    const book = await findBook(id);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    const existing = await readQrCodes({ bookId: id });
    const shortCode = toShortCode(book.title);
    const startSerial = existing.length + 1;

    const generated: Array<{ serial: string; code: string; qr: string }> = [];

    for (let i = 0; i < count; i++) {
      const serial = `${shortCode}-${String(startSerial + i).padStart(5, "0")}`;
      const code = makeToken();

      await writeQrCode({
        id: uuidv4(),
        code,
        serial,
        bookId: book.id,
        bookTitle: book.title,
        status: "pending",
        activatedAt: null,
        createdAt: new Date().toISOString(),
      });

      const verifyUrl = `${BASE_URL}/verify/${code}`;
      const qr = await QRCode.toDataURL(verifyUrl, {
        errorCorrectionLevel: "H",
        margin: 2,
        width: 400,
      });

      generated.push({ serial, code, qr });
    }

    res.json({ success: true, count: generated.length, codes: generated });
  } catch (err: any) {
    console.error("Generate codes failed:", err.message);
    res.status(500).json({ error: "Failed to generate QR codes" });
  }
});

// ─── List all codes (admin) ────────────────────────────────

router.get("/codes", authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const codes = await readQrCodes();
    res.json({ codes });
  } catch (err: any) {
    console.error("List codes failed:", err.message);
    res.status(500).json({ error: "Failed to load codes" });
  }
});

// ─── Activate a code (admin scans in Activate section) ─────

router.post("/codes/:code/activate", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const record = await findQrCode(code);
    if (!record) {
      return res.status(404).json({ error: "Code not found" });
    }
    if (record.status === "active") {
      return res.json({ success: true, alreadyActive: true, code: record });
    }
    const updated = await activateQrCode(code);
    res.json({ success: true, code: updated });
  } catch (err: any) {
    console.error("Activate code failed:", err.message);
    res.status(500).json({ error: "Failed to activate code" });
  }
});

// ─── Public verify (any user scans QR) ─────────────────────

router.get("/verify/:code", async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const record: QrCode | null = await findQrCode(code);
    if (!record) {
      return res.status(404).json({ error: "Invalid QR code", active: false });
    }

    const book = await findBook(record.bookId);

    if (record.status !== "active") {
      return res.json({
        active: false,
        status: record.status,
        code: { serial: record.serial, createdAt: record.createdAt },
        book: null,
      });
    }

    res.json({
      active: true,
      status: record.status,
      code: { serial: record.serial, activatedAt: record.activatedAt },
      book,
    });
  } catch (err: any) {
    console.error("Verify failed:", err.message);
    res.status(500).json({ error: "Verification failed" });
  }
});

export default router;
