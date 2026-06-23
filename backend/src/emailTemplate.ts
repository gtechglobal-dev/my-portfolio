import { readFileSync } from 'fs';
import { resolve } from 'path';

let logoDataUri: string | null = null;

function getLogo() {
  if (logoDataUri !== null) return logoDataUri;
  if (process.env.VERCEL === '1' || process.env.NETLIFY === 'true') {
    logoDataUri = '';
    return logoDataUri;
  }
  const candidates = [
    resolve(process.cwd(), '..', 'frontend', 'public', 'gtechName1.png'),
    resolve(process.cwd(), 'backend', '..', 'frontend', 'public', 'gtechName1.png'),
    resolve(process.cwd(), 'frontend', 'public', 'gtechName1.png'),
  ];
  for (const p of candidates) {
    try {
      const buf = readFileSync(p);
      logoDataUri = 'data:image/png;base64,' + buf.toString('base64');
      return logoDataUri;
    } catch { /* try next */ }
  }
  logoDataUri = '';
  return logoDataUri;
}

export function buildEmailHtml(message: string, subject: string = ''): string {
  const logo = getLogo();
  const paragraphs = message
    .split('\n')
    .filter(l => l.trim())
    .map(l => `<p style="margin:0 0 12px 0;">${escapeHtml(l)}</p>`)
    .join('\n                ');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center;">
              ${subject ? `<div style="font-size:18px;font-weight:700;color:#ffffff;">${escapeHtml(subject)}</div>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <div style="font-size:15px;line-height:1.7;color:#374151;">
                ${paragraphs || '<p style="margin:0;">&nbsp;</p>'}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 24px;text-align:center;">
              ${logo ? `<img src="${logo}" alt="Gtech Global" style="display:inline-block;border:0;max-width:200px;height:auto;" />` : '<div style="font-size:24px;font-weight:800;color:#4f46e5;letter-spacing:-0.5px;">GTECH GLOBAL</div>'}
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 4px;">
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:13px;color:#9ca3af;line-height:1.6;text-align:center;">
                    <div style="font-weight:500;color:#6b7280;">Professional Web Development &amp; Digital Services</div>
                    <div style="margin-top:8px;">
                      <a href="mailto:gtechglobal.dev@gmail.com" style="color:#4f46e5;text-decoration:none;font-weight:500;">gtechglobal.dev@gmail.com</a>
                    </div>
                    <div style="margin-top:16px;font-size:11px;color:#d1d5db;">
                      This email was sent in response to your booking enquiry.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" style="max-width:560px;">
          <tr>
            <td align="center" style="padding-top:24px;font-size:11px;color:#9ca3af;">
              &copy; ${new Date().getFullYear()} Gtech Global. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
