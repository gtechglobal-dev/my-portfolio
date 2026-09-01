import { Router, Response } from "express";
import { readBooks, findBook, updateBook, type Book } from "../db.js";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";

const router = Router();

// Clamp helper for numeric values coming from the client.
function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

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

// ─── Quick increment of sold copies (e.g. record a single sale) ──

router.post("/:id/sold", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const book = await findBook(id);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    const qty = Math.max(1, Math.min(parseInt(req.body.qty, 10) || 1, 10000));
    const sold = book.soldCopies || 0;
    const printed = book.printedCopies || 0;
    const newSold = Math.min(sold + qty, printed);

    const updated = await updateBook(id, { soldCopies: newSold });
    res.json({ success: true, book: updated });
  } catch (err: any) {
    console.error("Record sale failed:", err.message);
    res.status(500).json({ error: "Failed to record sale" });
  }
});

export default router;