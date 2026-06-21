import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import {
  generateToken,
  authMiddleware,
  type AuthRequest,
} from "../middleware/auth.js";
import { readBookings, readMessages } from "../db.js";
import { buildEmailHtml } from "../emailTemplate.js";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "gtechglobal.dev@gmail.com";
const SMTP_PASS = process.env.SMTP_PASS || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "gtechglobal.dev@gmail.com";

const router = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(
  process.env.ADMIN_PASSWORD || "gtech26",
  10,
);

router.post("/login", (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  if (
    username !== ADMIN_USERNAME ||
    !bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)
  ) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = generateToken(username);
  res.json({ token, username });
});

router.get("/stats", authMiddleware, (req: AuthRequest, res: Response) => {
  const bookings = readBookings();
  const messages = readMessages();

  const stats = {
    totalBookings: bookings.length,
    pendingBookings: bookings.filter((b) => b.status === "pending").length,
    approvedBookings: bookings.filter((b) => b.status === "approved").length,
    completedBookings: bookings.filter((b) => b.status === "completed").length,
    cancelledBookings: bookings.filter((b) => b.status === "cancelled").length,
    totalMessages: messages.length,
    unreadMessages: messages.filter((m) => !m.read).length,
    recentBookings: bookings
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5),
  };

  res.json(stats);
});

router.get("/verify", authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ valid: true, username: req.admin?.username });
});

router.post("/send-email", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { to, subject, text } = req.body;

  if (!to || !subject || !text) {
    return res.status(400).json({ error: "To, subject, and message are required" });
  }

  if (!SMTP_PASS) {
    return res.status(500).json({
      error: "SMTP_PASS environment variable not set. Configure your email credentials.",
      hint: "Set SMTP_PASS (Gmail app password) in your environment variables.",
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      requireTLS: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: `"Gtech Global" <${EMAIL_FROM}>`,
      to,
      subject,
      text,
      html: buildEmailHtml(text, subject),
    });

    res.json({ success: true, message: "Email sent successfully" });
  } catch (err: any) {
    console.error("Email send failed:", err.message);
    res.status(500).json({ error: `Failed to send email: ${err.message}` });
  }
});

export default router;
