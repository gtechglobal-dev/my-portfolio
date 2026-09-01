import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import {
  readBooks,
  findBook,
  updateBook,
  recordSaleToBook,
  type Book,
  type SaleEntry,
} from "../db.js";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";

const router = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(
  process.env.ADMIN_PASSWORD || "gtech26",
  10,
);

// Clamp helper for numeric values coming from the client.
function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

// ─── Re-verify the admin password before sensitive inventory edits ──

router.post("/verify-password", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { password } = req.body ?? {};
  if (typeof password !== "string" || password.length === 0) {
    return res.status(400).json({ error: "Password is required" });
  }
  // Not tied to username so a freshly logged-in session can just confirm the key.
  if (req.admin?.username === ADMIN_USERNAME && bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
    return res.json({ valid: true });
  }
  return res.json({ valid: false });
});

// ─── Aggregate sales & revenue dashboard (admin) ─────────────

router.get("/", authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const books = await readBooks();
    const rows = books.map((b) => {
        const printed = b.printedCopies || 0;
        const sold = Math.min(b.soldCopies || 0, printed);
        const price = b.price || 0;
        return {
          id: b.id,
          title: b.title,
          author: b.author,
          frontCover: b.frontCover || null,
          printed,
          sold,
          remaining: printed - sold,
          price,
          revenue: sold * price,
          percentSold: printed > 0 ? Math.round((sold / printed) * 100) : 0,
          salesLog: b.salesLog || [],
        };
      });

    const totals = rows.reduce(
      (acc, r) => {
        acc.printed += r.printed;
        acc.sold += r.sold;
        acc.revenue += r.revenue;
        return acc;
      },
      { printed: 0, sold: 0, revenue: 0 }
    );

    res.json({ sales: rows, totals });
  } catch (err: any) {
    console.error("List sales failed:", err.message);
    res.status(500).json({ error: "Failed to load sales data" });
  }
});

// ─── Set / update a book's inventory, pricing, and sold count ──

router.post("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const book = await findBook(id);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    const update: Partial<Book> = {};
    if (req.body.printedCopies !== undefined) {
      update.printedCopies = toNum(req.body.printedCopies);
    }
    if (req.body.soldCopies !== undefined) {
      update.soldCopies = toNum(req.body.soldCopies);
    }
    if (req.body.price !== undefined) {
      update.price = toNum(req.body.price);
    }

    const updated = await updateBook(id, update);
    res.json({ success: true, book: updated });
  } catch (err: any) {
    console.error("Update sales failed:", err.message);
    res.status(500).json({ error: "Failed to update sales data" });
  }
});

// ─── Record a sale: increments sold count, logs seller + date + revenue ──

router.post("/:id/sold", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const book = await findBook(id);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    const qty = Math.max(1, Math.min(parseInt(req.body.qty, 10) || 1, 10000));
    const seller = typeof req.body.seller === "string" ? req.body.seller.trim() : "";
    if (!seller) {
      return res.status(400).json({ error: "Seller name is required" });
    }

    const sold = book.soldCopies || 0;
    const printed = book.printedCopies || 0;
    const cappedQty = Math.min(qty, Math.max(0, printed - sold));

    const price = book.price || 0;
    const revenue = cappedQty * price;
    const logId = randomBytes(8).toString("hex");

    // Pin the per-sale price from the book at transaction time so history stays accurate.
    const updated = await recordSaleToBook(id, price, cappedQty, revenue, seller, logId);
    res.json({
      success: true,
      book: updated,
      sale: { id: logId, seller, qty: cappedQty, price, revenue, date: new Date().toISOString() },
    });
  } catch (err: any) {
    console.error("Record sale failed:", err.message);
    res.status(500).json({ error: "Failed to record sale" });
  }
});

// ─── All recorded sales across every book (newest first) ───────────

router.get("/log", authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const books = await readBooks();
    const entries: Array<SaleEntry & { bookId: string; bookTitle: string; author: string }> = [];
    for (const b of books) {
      if (!b.salesLog || b.salesLog.length === 0) continue;
      for (const e of b.salesLog) {
        entries.push({
          ...e,
          bookId: b.id,
          bookTitle: b.title,
          author: b.author,
        });
      }
    }
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totals = entries.reduce(
      (acc, e) => {
        acc.qty += e.qty;
        acc.revenue += e.revenue;
        return acc;
      },
      { qty: 0, revenue: 0 }
    );

    res.json({ sales: entries, totals });
  } catch (err: any) {
    console.error("List sales log failed:", err.message);
    res.status(500).json({ error: "Failed to load sales log" });
  }
});

export default router;