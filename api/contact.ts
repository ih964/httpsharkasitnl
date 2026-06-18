import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.CONTACT_FROM_EMAIL || 'Harkas IT <info@harkasit.nl>';
const toEmail = process.env.CONTACT_TO_EMAIL || 'info@harkasit.nl';

const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!resendApiKey) {
    return res.status(500).json({ error: 'Missing RESEND_API_KEY' });
  }

  const { name, email, phone, service, message } = req.body || {};

  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim();
  const cleanPhone = String(phone || '').trim();
  const cleanService = String(service || '').trim();
  const cleanMessage = String(message || '').trim();

  if (!cleanName || !cleanEmail || !cleanMessage || !isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: 'Invalid form data' });
  }

  const resend = new Resend(resendApiKey);

  try {
    await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      replyTo: cleanEmail,
      subject: `Nieuwe aanvraag via harkasit.nl - ${cleanService || cleanName}`,
      text: [
        'Nieuwe aanvraag via harkasit.nl',
        '',
        `Naam: ${cleanName}`,
        `E-mail: ${cleanEmail}`,
        `Telefoon: ${cleanPhone || 'Niet ingevuld'}`,
        `Onderwerp: ${cleanService || 'Niet gekozen'}`,
        '',
        'Bericht:',
        cleanMessage,
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2>Nieuwe aanvraag via harkasit.nl</h2>
          <p><strong>Naam:</strong> ${escapeHtml(cleanName)}</p>
          <p><strong>E-mail:</strong> ${escapeHtml(cleanEmail)}</p>
          <p><strong>Telefoon:</strong> ${escapeHtml(cleanPhone || 'Niet ingevuld')}</p>
          <p><strong>Onderwerp:</strong> ${escapeHtml(cleanService || 'Niet gekozen')}</p>
          <hr />
          <p><strong>Bericht:</strong></p>
          <p>${escapeHtml(cleanMessage).replace(/\n/g, '<br />')}</p>
        </div>
      `,
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'Email could not be sent' });
  }
}
