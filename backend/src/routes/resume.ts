import { Router, Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { resumeData } from '../resumeData.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const router = Router();

const INDIGO = '#4f46e5';
const DARK = '#1e1b4b';
const GRAY = '#6b7280';
const LIGHT_GRAY = '#f3f4f6';

function getLogoBuffer(): Buffer | null {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const candidates = [
      resolve(__dirname, '..', '..', 'frontend', 'public', 'gtechName1.png'),
      resolve(process.cwd(), 'frontend', 'public', 'gtechName1.png'),
    ];
    for (const p of candidates) {
      try { return readFileSync(p); } catch { }
    }
  } catch { }
  return null;
}

function wrapText(doc: PDFKit.PDFDocument, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const fontSize = doc.fontSize();
  const chars = text.split('');
  let line = '';
  let cy = y;
  for (const char of chars) {
    const testLine = line + char;
    if (doc.widthOfString(testLine) > maxWidth && line.length > 0) {
      doc.text(line, x, cy, { continued: false });
      cy += lineHeight;
      line = char;
    } else {
      line = testLine;
    }
  }
  if (line) {
    doc.text(line, x, cy, { continued: false });
    cy += lineHeight;
  }
  return cy;
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string, y: number): number {
  doc.fontSize(14).font('Helvetica-Bold').fillColor(INDIGO);
  doc.text(title, 50, y);
  doc.moveTo(50, y + 18).lineTo(545, y + 18).strokeColor(INDIGO).lineWidth(1).stroke();
  return y + 28;
}

function drawBullet(doc: PDFKit.PDFDocument, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  doc.fontSize(9).font('Helvetica').fillColor(DARK);
  const bulletX = x;
  doc.text('•', bulletX, y);
  const textX = x + 10;
  const lines = doc.fontSize(9).text(text, textX, y, { width: maxWidth - 10, lineHeight: lineHeight / doc.fontSize() });
  const height = doc.y - y;
  return y + height + 2;
}

router.get('/download', (_req: Request, res: Response) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="Okoro_Ebube_Resume.pdf"');

  doc.pipe(res);

  const pageWidth = doc.page.width;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  const logo = getLogoBuffer();

  doc.fontSize(28).font('Helvetica-Bold').fillColor(DARK);
  doc.text(resumeData.name, margin, 50);

  doc.fontSize(12).font('Helvetica').fillColor(INDIGO);
  doc.text(resumeData.title, margin, doc.y + 4);

  doc.fontSize(9).font('Helvetica').fillColor(GRAY);
  const contactY = doc.y + 8;
  const contactLine = `${resumeData.email}  |  ${resumeData.phone}  |  ${resumeData.location}  |  linkedin.com/in/okoroebube-gtech/`;
  doc.text(contactLine, margin, contactY, { width: contentWidth });

  doc.moveTo(margin, doc.y + 10).lineTo(pageWidth - margin, doc.y + 10).strokeColor('#e5e7eb').lineWidth(1).stroke();

  let y = doc.y + 24;

  y = drawSectionTitle(doc, 'PROFESSIONAL SUMMARY', y);
  doc.fontSize(10).font('Helvetica').fillColor(DARK);
  const summaryLines = doc.text(resumeData.summary, margin, y, { width: contentWidth, lineHeight: 1.6 });
  y = doc.y + 10;

  y = drawSectionTitle(doc, 'SKILLS & EXPERTISE', y);
  doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK);
  for (const skillGroup of resumeData.skills) {
    doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK);
    doc.text(`${skillGroup.category}: `, margin, y, { continued: true });
    doc.font('Helvetica').fillColor(GRAY);
    doc.text(skillGroup.items.join(',  •  '), { width: contentWidth - doc.widthOfString(`${skillGroup.category}: `) });
    y = doc.y + 2;
  }
  y += 6;

  y = drawSectionTitle(doc, 'EXPERIENCE', y);
  for (const exp of resumeData.experience) {
    doc.fontSize(11).font('Helvetica-Bold').fillColor(DARK);
    doc.text(exp.role, margin, y);
    doc.fontSize(9).font('Helvetica').fillColor(GRAY);
    doc.text(`${exp.company}  |  ${exp.period}`, margin, doc.y + 2, { width: contentWidth });
    y = doc.y + 6;
    for (const h of exp.highlights) {
      y = drawBullet(doc, h, margin, y, contentWidth, 14);
    }
    y += 4;
  }

  y = drawSectionTitle(doc, 'SELECTED PROJECTS', y);
  for (const proj of resumeData.projects) {
    doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK);
    doc.text(proj.title, margin, y);
    doc.fontSize(8).font('Helvetica-Oblique').fillColor(INDIGO);
    doc.text(proj.tech, margin, doc.y + 1, { width: contentWidth });
    doc.fontSize(9).font('Helvetica').fillColor(GRAY);
    doc.text(proj.description, margin, doc.y + 2, { width: contentWidth, lineHeight: 1.4 });
    y = doc.y + 6;

    if (y > 720) {
      doc.addPage();
      y = 50;
    }
  }

  y = drawSectionTitle(doc, 'SERVICES', y);
  for (const s of resumeData.services) {
    y = drawBullet(doc, s, margin, y, contentWidth, 14);
  }
  y += 4;

  y = drawSectionTitle(doc, 'EDUCATION', y);
  for (const edu of resumeData.education) {
    doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK);
    doc.text(edu.degree, margin, y);
    doc.fontSize(9).font('Helvetica').fillColor(GRAY);
    doc.text(`${edu.institution}  |  ${edu.period}`, margin, doc.y + 2);
    y = doc.y + 10;
  }

  doc.end();
});

export default router;
