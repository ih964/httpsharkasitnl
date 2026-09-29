import * as tls from 'node:tls';
import { randomUUID, timingSafeEqual } from 'node:crypto';

const SMTP_HOST = process.env.SMTP_HOST || 'shared70.cloud86-host.nl';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER || 'info@harkasit.nl';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || 'Harkas IT';
const SMTP_REPLY_TO = process.env.SMTP_REPLY_TO || 'info@harkasit.nl';
const SMTP_API_TOKEN = process.env.SMTP_API_TOKEN || '';

class SmtpReader {
  constructor(socket) {
    this.buffer = '';
    this.queue = [];
    this.waiters = [];
    this.failure = null;
    socket.on('data', (chunk) => {
      this.buffer += chunk.toString('utf8');
      const lines = this.buffer.split(/\r?\n/);
      this.buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line) continue;
        const waiter = this.waiters.shift();
        if (waiter) waiter.resolve(line);
        else this.queue.push(line);
      }
    });
    const fail = (error) => {
      if (this.failure) return;
      this.failure = error instanceof Error ? error : new Error(String(error));
      while (this.waiters.length) this.waiters.shift()?.reject(this.failure);
    };
    socket.on('error', fail);
    socket.on('timeout', () => fail(new Error('SMTP connection timed out')));
    socket.on('close', () => {
      if (!this.failure && this.waiters.length) fail(new Error('SMTP connection closed unexpectedly'));
    });
  }
  nextLine() {
    if (this.queue.length) return Promise.resolve(this.queue.shift());
    if (this.failure) return Promise.reject(this.failure);
    return new Promise((resolve, reject) => this.waiters.push({ resolve, reject }));
  }
  async response() {
    const lines = [];
    let expectedCode = null;
    while (true) {
      const line = await this.nextLine();
      lines.push(line);
      const match = line.match(/^(\d{3})([ -])(.*)$/);
      if (!match) continue;
      const [, code, separator] = match;
      if (!expectedCode) expectedCode = code;
      if (code === expectedCode && separator === ' ') return { code: Number(code), lines };
    }
  }
}

const encodeHeader = (value) => `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
const base64Body = (value) => {
  const encoded = Buffer.from(value.replace(/\r?\n/g, '\r\n'), 'utf8').toString('base64');
  return encoded.match(/.{1,76}/g)?.join('\r\n') || '';
};
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !/[\r\n]/.test(email);
const constantTimeEqual = (left, right) => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};
const assertResponse = (response, expected, action) => {
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (!allowed.includes(response.code)) {
    throw new Error(`SMTP ${action} failed with ${response.code}: ${response.lines.join(' | ')}`);
  }
};
async function command(socket, reader, value, expected, action) {
  socket.write(`${value}\r\n`);
  const response = await reader.response();
  assertResponse(response, expected, action);
}

async function sendSmtpMail(to, subject, text) {
  if (!SMTP_PASS) throw new Error('SMTP_PASS is not configured');
  const socket = tls.connect({ host: SMTP_HOST, port: SMTP_PORT, servername: SMTP_HOST, rejectUnauthorized: true });
  socket.setTimeout(20000);
  const reader = new SmtpReader(socket);

  await new Promise((resolve, reject) => {
    const onError = (error) => { socket.off('secureConnect', onSecure); reject(error); };
    const onSecure = () => { socket.off('error', onError); resolve(); };
    socket.once('secureConnect', onSecure);
    socket.once('error', onError);
  });

  try {
    assertResponse(await reader.response(), 220, 'greeting');
    await command(socket, reader, 'EHLO harkasit.nl', 250, 'EHLO');
    await command(socket, reader, 'AUTH LOGIN', 334, 'AUTH LOGIN');
    await command(socket, reader, Buffer.from(SMTP_USER).toString('base64'), 334, 'username');
    await command(socket, reader, Buffer.from(SMTP_PASS).toString('base64'), 235, 'password');
    await command(socket, reader, `MAIL FROM:<${SMTP_USER}>`, 250, 'MAIL FROM');
    await command(socket, reader, `RCPT TO:<${to}>`, [250, 251], 'RCPT TO');
    await command(socket, reader, 'DATA', 354, 'DATA');

    const messageId = `<${randomUUID()}@harkasit.nl>`;
    const headers = [
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: ${messageId}`,
      `From: ${encodeHeader(SMTP_FROM_NAME)} <${SMTP_USER}>`,
      `To: <${to}>`,
      `Reply-To: <${SMTP_REPLY_TO}>`,
      `Subject: ${encodeHeader(subject)}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
    ];
    socket.write(`${headers.join('\r\n')}\r\n\r\n${base64Body(text)}\r\n.\r\n`);
    assertResponse(await reader.response(), 250, 'message delivery');
    socket.write('QUIT\r\n');
    return messageId;
  } finally {
    socket.end();
  }
}

export default async function handler(req, res) {
  const expectedAuth = `Bearer ${SMTP_API_TOKEN}`;
  const receivedAuth = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization || '';
  if (!SMTP_API_TOKEN || !receivedAuth || !constantTimeEqual(receivedAuth, expectedAuth)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, configured: Boolean(SMTP_PASS), host: SMTP_HOST, port: SMTP_PORT, sender: SMTP_USER });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const cleanTo = String(req.body?.to || '').trim();
  const cleanSubject = String(req.body?.subject || '').trim();
  const cleanText = String(req.body?.text || '').trim();
  if (!isValidEmail(cleanTo) || !cleanSubject || !cleanText || cleanSubject.length > 250 || cleanText.length > 50000 || /[\r\n]/.test(cleanSubject)) {
    return res.status(400).json({ error: 'Invalid email payload' });
  }
  try {
    const messageId = await sendSmtpMail(cleanTo, cleanSubject, cleanText);
    return res.status(200).json({ ok: true, messageId });
  } catch (error) {
    console.error('SMTP send failed', error instanceof Error ? error.message : error);
    return res.status(502).json({ error: 'SMTP send failed' });
  }
}
