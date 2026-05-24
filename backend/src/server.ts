import express from "express";
import cors from "cors";
import path from "path";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

app.use(cors());
app.use(express.json());

app.post("/api/contact", (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  console.log("Contact form submission:", { name, email, message });

  res.json({ success: true, message: "Message received successfully" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

const frontendDist = path.join(__dirname, "../../frontend/dist");
app.use(express.static(frontendDist));
app.use((_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
