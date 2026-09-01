import { Router, Response } from "express";
import { randomBytes } from "crypto";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import { v2 as cloudinary } from "cloudinary";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import {
  readBooks,
  findBook,
  findBookByCode,
  writeBook,
  updateBook,
  deleteBook,
  assignBookCode,
  readQrCodes,
  findQrCode,
  findQrCodeBySerial,
  findSerial,
  serialExists,
  writeQrCode,
  activateQrCode,
  revokeQrCode,
  deleteQrCode,
  recordVerification,
  deleteQrCodesByBook,
  type Book,
  type QrCode,
} from "../db.js";
import { geoLocate } from "../services/geo.js";
import { sendFlaggedCopyWhatsApp } from "../services/whatsapp.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const COVER_FOLDER = "gtech-portfolio/book-covers";

const router = Router();

const BASE_URL =
  process.env.QR_BASE_URL ||
  process.env.FRONTEND_URL ||
  "https://gtechglobal.dev";

function makeToken(): string {
  return randomBytes(12).toString("hex");
}

// Random undecypherable serial suffix like "AB1234" (2 letters + 4 digits)
// The space is ~ 26 * 26 * 9000 = ~6M distinct suffixes; combined with the
// in-memory used set + a DB unique index + a pre-insert existence check, the
// same serial can never be created twice.
function makeSerialSuffix(): string {
  const letters = Array.from(
    { length: 2 },
    () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)]
  ).join("");
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return `${letters}${digits}`;
}

async function nextUniqueSerial(): Promise<string> {
  // Infinite-ish retry — practically bounded because the suffix space is huge;
  // the unique DB index is the final guarantee against any collision.
  for (;;) {
    const serial = `OKSON-${makeSerialSuffix()}`;
    if (!(await serialExists(serial))) return serial;
  }
}

async function uploadCover(image: string, title: string): Promise<string | null> {
  try {
    const match = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) return null;
    const result = await cloudinary.uploader.upload(image, {
      folder: COVER_FOLDER,
      context: `title=${(title || "").replace(/[|,=]/g, "").slice(0, 80)}`,
    });
    return result.secure_url;
  } catch (err: any) {
    console.error("Cover upload error:", err.message);
    return null;
  }
}

// Extract the Cloudinary `public_id` from a stored secure_url and delete the asset.
// secure_url looks like .../image/upload/v1234567/gtech-portfolio/book-covers/abc123.jpg
async function deleteCloudinaryCover(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const m = String(url).match(/\/image\/upload\/v\d+\/(.+?)\.[a-zA-Z]{3,4}$/);
  if (!m) return;
  const publicId = m[1];
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err: any) {
    console.error("Cover delete error:", err.message);
  }
}

// ─── Register a book (admin) ───────────────────────────────

router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, author, isbn, publisher, year, edition, description, category, frontCover, backCover } = req.body;

    if (!title || !author) {
      return res.status(400).json({ error: "Title and author are required" });
    }

    let frontCov: string | null = null;
    let backCov: string | null = null;
    try {
      frontCov = frontCover ? await uploadCover(frontCover, title) : null;
      backCov = backCover ? await uploadCover(backCover, title) : null;
    } catch (err: any) {
      console.error("Cover upload failed:", err.message);
    }

    // Every book gets ONE unique book code — the single QR printed on each copy.
    let bookCode = makeToken();
    let existingBook = await findBookByCode(bookCode);
    while (existingBook) {
      bookCode = makeToken();
      existingBook = await findBookByCode(bookCode);
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
      frontCover: frontCov,
      backCover: backCov,
      bookCode,
      createdAt: new Date().toISOString(),
    };

    await writeBook(book);

    const verifyUrl = `${BASE_URL}/verify/${bookCode}`;
    const qr = await QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 400,
    });

    res.json({ success: true, book, qr });
  } catch (err: any) {
    console.error("Register book failed:", err.message);
    res.status(500).json({ error: "Failed to register book" });
  }
});

// ─── Upload covers for an existing book (admin) ─────────────

router.post("/:id/covers", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const book = await findBook(id);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    const { frontCover, backCover } = req.body;

    const update: Partial<Book> = {};
    if (frontCover) {
      // Replacing an existing cover — remove the old Cloudinary asset first.
      await deleteCloudinaryCover(book.frontCover);
      const url = await uploadCover(frontCover, book.title);
      if (url) update.frontCover = url;
    }
    if (backCover) {
      await deleteCloudinaryCover(book.backCover);
      const url = await uploadCover(backCover, book.title);
      if (url) update.backCover = url;
    }

    const updated = await updateBook(id, update);
    res.json({ success: true, book: updated });
  } catch (err: any) {
    console.error("Upload covers failed:", err.message);
    res.status(500).json({ error: "Failed to upload covers" });
  }
});

// ─── Delete a single cover (also removes the asset from Cloudinary) ──

router.delete("/:id/cover/:kind", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id, kind } = req.params;
    if (kind !== "front" && kind !== "back") {
      return res.status(400).json({ error: "Invalid cover type" });
    }
    const book = await findBook(id);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    const existing = kind === "front" ? book.frontCover : book.backCover;
    if (!existing) {
      return res.status(404).json({ error: `No ${kind} cover to delete` });
    }

    const update: Partial<Book> = {};
    if (kind === "front") update.frontCover = null;
    else update.backCover = null;

    await deleteCloudinaryCover(existing);
    const updated = await updateBook(id, update);
    res.json({ success: true, book: updated });
  } catch (err: any) {
    console.error("Delete cover failed:", err.message);
    res.status(500).json({ error: "Failed to delete cover" });
  }
});

// ─── Update book details (admin) ───────────────────────────

router.patch("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const book = await findBook(id);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    const { title, author, isbn, publisher, year, edition, description, category, frontCover, backCover } = req.body;

    const update: Partial<Book> = {};
    if (typeof title === "string") update.title = title.trim();
    if (typeof author === "string") update.author = author.trim();
    if (typeof isbn === "string") update.isbn = isbn.trim();
    if (typeof publisher === "string") update.publisher = publisher.trim() || "Okson Publishers";
    if (typeof year === "string") update.year = year.trim();
    if (typeof edition === "string") update.edition = edition.trim();
    if (typeof description === "string") update.description = description.trim();
    if (typeof category === "string") update.category = category.trim() || "General";

    // Cover edits — a new data-URL upload replaces (and deletes) the old asset.
    if (frontCover) {
      await deleteCloudinaryCover(book.frontCover);
      const url = await uploadCover(frontCover, book.title.trim() || update.title || book.title);
      if (url) update.frontCover = url;
    }
    if (backCover) {
      await deleteCloudinaryCover(book.backCover);
      const url = await uploadCover(backCover, book.title.trim() || update.title || book.title);
      if (url) update.backCover = url;
    }
    if (frontCover === null) {
      await deleteCloudinaryCover(book.frontCover);
      update.frontCover = null;
    }
    if (backCover === null) {
      await deleteCloudinaryCover(book.backCover);
      update.backCover = null;
    }

    if (update.title === "" || update.author === "") {
      return res.status(400).json({ error: "Title and author are required" });
    }

    const updated = await updateBook(id, update);
    res.json({ success: true, book: updated });
  } catch (err: any) {
    console.error("Update book failed:", err.message);
    res.status(500).json({ error: "Failed to update book" });
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
    const book = await findBook(id);
    await deleteCloudinaryCover(book?.frontCover);
    await deleteCloudinaryCover(book?.backCover);
    await deleteBook(id);
    await deleteQrCodesByBook(id);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Delete book failed:", err.message);
    res.status(500).json({ error: "Failed to delete book" });
  }
});

// ─── Generate serial numbers for a book (admin) ────────────
// One QR code per book; every serial number generated under that book is
// verifiable when the reader scans the book's QR and enters the serial.

router.post("/:id/generate", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const count = Math.max(1, Math.min(parseInt(req.body.count, 10) || 1, 500));

    const book = await findBook(id);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    // Make sure legacy books all have a book code.
    if (!book.bookCode) {
      book.bookCode = await assignBookCode(book.id);
    }

    const existing = await readQrCodes({ bookId: id });
    const usedSerials = new Set(existing.map((c) => c.serial));

    const generated: Array<{ serial: string; code: string }> = [];
    const createdIds: string[] = [];

    for (let i = 0; i < count; i++) {
      let serial = await nextUniqueSerial();
      while (usedSerials.has(serial)) {
        serial = await nextUniqueSerial();
      }
      usedSerials.add(serial);

      const code = makeToken();
      const serialId = uuidv4();

      await writeQrCode({
        id: serialId,
        code,
        serial,
        bookId: book.id,
        bookTitle: book.title,
        status: "pending",
        activatedAt: null,
        createdAt: new Date().toISOString(),
      });

      createdIds.push(serialId);
      generated.push({ serial, code });
    }

    // The single QR for the book (identical for all its serial numbers).
    const verifyUrl = `${BASE_URL}/verify/${book.bookCode}`;
    const qr = await QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 400,
    });

    res.json({ success: true, count: generated.length, codes: generated, serialIds: createdIds, bookCode: book.bookCode, qr });
  } catch (err: any) {
    console.error("Generate codes failed:", err.message);
    res.status(500).json({ error: "Failed to generate QR codes" });
  }
});

// ─── Get the single QR for a book (admin) ──────────────────

router.get("/:id/qr", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const book = await findBook(id);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    if (!book.bookCode) {
      book.bookCode = await assignBookCode(book.id);
    }
    const verifyUrl = `${BASE_URL}/verify/${book.bookCode}`;
    const qr = await QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 400,
    });
    res.json({ success: true, bookCode: book.bookCode, qr, verifyUrl });
  } catch (err: any) {
    console.error("Get book QR failed:", err.message);
    res.status(500).json({ error: "Failed to load book QR" });
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

// ─── Get code details with scan history (admin) ────────────

router.get("/codes/:code/detail", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const record = await findQrCode(code);
    if (!record) {
      return res.status(404).json({ error: "Code not found" });
    }
    const book = await findBook(record.bookId);
    res.json({
      success: true,
      code: record,
      book,
    });
  } catch (err: any) {
    console.error("Get code detail failed:", err.message);
    res.status(500).json({ error: "Failed to load code details" });
  }
});

// ─── Activate a serial number (admin) ──────────────────────
// Accepts either the serial (OKSON-XXXXXX) or the serial record token.

router.post("/codes/:code/activate", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const value = code.trim().toUpperCase();
    const record =
      value.startsWith("OKSON-") ? await findQrCodeBySerial(value) : await findQrCode(code);
    if (!record) {
      return res.status(404).json({ error: "Code not found" });
    }
    if (record.status === "active") {
      return res.json({ success: true, alreadyActive: true, code: record });
    }
    const updated = await activateQrCode(record.code);
    res.json({ success: true, code: updated });
  } catch (err: any) {
    console.error("Activate code failed:", err.message);
    res.status(500).json({ error: "Failed to activate code" });
  }
});

// ─── Revoke / delete a serial number (admin) ───────────────

router.delete("/codes/:code", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const value = code.trim().toUpperCase();
    const record =
      value.startsWith("OKSON-") ? await findQrCodeBySerial(value) : await findQrCode(code);
    if (!record) {
      return res.status(404).json({ error: "Code not found" });
    }
    if (record.status === "revoked") {
      return res.json({ success: true, alreadyRevoked: true, code: record });
    }
    const updated = await revokeQrCode(record.code);
    res.json({ success: true, code: updated });
  } catch (err: any) {
    console.error("Revoke code failed:", err.message);
    res.status(500).json({ error: "Failed to revoke code" });
  }
});

// ─── Permanently delete a serial number (admin) ────────────

router.delete("/codes/:code/delete", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const value = code.trim().toUpperCase();
    const record =
      value.startsWith("OKSON-") ? await findQrCodeBySerial(value) : await findQrCode(code);
    if (!record) {
      return res.status(404).json({ error: "Code not found" });
    }
    await deleteQrCode(record.code);
    res.json({ success: true, deleted: record.serial });
  } catch (err: any) {
    console.error("Delete code failed:", err.message);
    res.status(500).json({ error: "Failed to delete code" });
  }
});

// ─── Public verify (any user scans QR) ─────────────────────

function clientIp(req: AuthRequest): string {
  const xff = (req.headers["x-forwarded-for"] as string) || "";
  const ip = xff.split(",")[0].trim() || req.socket?.remoteAddress || req.ip || "unknown";
  return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

// Step 1 — check the book QR is valid before the user types their serial.
// Does NOT record a verification.
router.get("/verify/:bookCode", async (req: AuthRequest, res: Response) => {
  try {
    const { bookCode } = req.params;
    const book = await findBookByCode(bookCode);
    if (!book) {
      return res.status(404).json({ error: "Invalid QR code", active: false, status: "invalid" });
    }

    // Active book — prompt for the serial number written on the book.
    res.json({
      active: true,
      status: "active",
      needsSerial: true,
      book: publicBook(book),
      code: { serial: null },
    });
  } catch (err: any) {
    console.error("Verify failed:", err.message);
    res.status(500).json({ error: "Verification failed" });
  }
});

// Step 2 — user submits the serial number written on the book.
// Records the verification (with geolocation) only after the serial matches a
// serial number issued for this book's QR code.
router.post("/verify/:bookCode", async (req: AuthRequest, res: Response) => {
  try {
    const { bookCode } = req.params;
    const serial = (req.body?.serial || "").toString().trim().toUpperCase();

    const book = await findBookByCode(bookCode);
    if (!book) {
      return res.status(404).json({ error: "Invalid QR code", active: false, status: "invalid" });
    }

    if (!serial) {
      return res.status(400).json({ error: "Please enter the serial number written on the book." });
    }

    const record: QrCode | null = await findSerial(serial, book.id);
    if (!record) {
      return res.status(404).json({ error: "The serial number you entered is not valid for this book. Please verify it matches the number printed on the book." });
    }

    if (record.status === "revoked") {
      return res.json({
        active: false,
        status: "revoked",
        code: { serial: record.serial, createdAt: record.createdAt, activatedAt: record.activatedAt },
        book: publicBook(book),
      });
    }

    if (record.status !== "active") {
      return res.json({
        active: false,
        status: "pending",
        code: { serial: record.serial, createdAt: record.createdAt },
        book: publicBook(book),
      });
    }

    let updated = record;
    let shouldAlert = false;
    const userAgent = req.headers["user-agent"] as string | undefined;
    try {
      const ip = clientIp(req);
      const geo = await geoLocate(ip);
      const result = await recordVerification(record.code, ip, userAgent, {
        country: geo.country,
        state: geo.state,
        city: geo.city,
      });
      updated = result.record || record;
      shouldAlert = result.shouldAlert;
    } catch (err: any) {
      console.error("Verification log failed:", err.message);
    }

    // Alert the admin (fires when the serial gets scanned from many distinct
    // locations in a short window). Non-blocking; flagged info is NOT shown to
    // visitors — it is for the admin's eyes only.
    if (shouldAlert) {
      const locations = (updated.locations || []).slice(0, 12);
      sendFlaggedCopyWhatsApp({
        serial: updated.serial,
        bookTitle: updated.bookTitle,
        distinctLocations: (updated.locations || []).length,
        locations,
        timeWindow: "the last 24 hours",
      }).catch(() => undefined);
    }

    res.json({
      active: true,
      status: "active",
      code: {
        serial: updated.serial,
        activatedAt: updated.activatedAt,
        verifyCount: updated.verifyCount || 0,
        lastVerifiedAt: updated.lastVerifiedAt || null,
      },
      book: publicBook(book),
    });
  } catch (err: any) {
    console.error("Verify failed:", err.message);
    res.status(500).json({ error: "Verification failed" });
  }
});

function publicBook(b: Book) {
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    isbn: b.isbn || "",
    publisher: b.publisher,
    year: b.year || "",
    edition: b.edition || "",
    description: b.description || "",
    category: b.category || "",
    frontCover: b.frontCover || null,
    backCover: b.backCover || null,
    createdAt: b.createdAt,
  };
}

// ─── Public: list other books (for the verification carousel) ─

router.get("/public/books", async (_req, res: Response) => {
  try {
    const books = await readBooks();
    const others = books.map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      edition: b.edition,
      frontCover: b.frontCover || null,
    }));
    res.json({ books: others });
  } catch (err: any) {
    console.error("List public books failed:", err.message);
    res.json({ books: [] });
  }
});

export default router;
