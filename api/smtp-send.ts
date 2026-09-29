import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as tls from 'node:tls';
import { randomUUID, timingSafeEqual } from 'node:crypto';

const SMTP_HOST = process.env.SMTP_HOST || 'shared70.cloud86-host.nl';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER || 'info@harkasit.nl';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || 'Harkas IT';
const SMTP_REPLY_TO = process.env.SMTP_REPLY_TO || 'info@harkasit.nl';
const SMTP_API_TOKEN = process.env.SMTP_API_TOKEN || '';

type SmtpResponse = {
  code: number;
  lines: string[];
};

class SmtpReader {
  private buffer = '';
  private queue: string[] = [];
  private waiters: Array<{
    resolve: (line: string) => void;
    reject: (error: Error) => void;
  }> = [];
  private failure: Error | null = null;

  constructor(socket: tls.TLSSocket) {
    socket.on('data', (chunk: Buffer) => {
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

    const fail = (error: Error) => {
      if (this.failure) return;
      this.failure = error;
      while (this.waiters.length) {
        this.waiters.shift()?.reject(error);
      }
    };

    socket.on('error', fail);
    socket.on('timeout', () => fail(new Error('SMTP connection timed out')));
    socket.on('close', () => {
      if (!this.failure && this.waiters.length) {
        fail(new Error('SMTP connection closed unexpectedly'));
      }
    });
  }

  private nextLine(): Promise<string> {
    if (this.queue.length) {
      return Promise.resolve(this.queue.shift() as string);
    }
    if (this.failure) {
      return Promise.reject(this.failure);
    }
    return new Promise((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
  }

  async response(): Promise<SmtpResponse> {
    const lines: string[] = [];
    let expectedCode: string | null = null;

    while (true) {
      const line = await this.nextLine();
      lines.push(line);

      const match = line.match(/^(\d{3})([ -])(.*)$/);
      if (!match) continue;

      const [, code, separator] = match;
      if (!expectedCode) expectedCode = code;

      if (code === expectedCode && separator === ' ') {
        return { code: Number(code), lines };
      }
    }
  }
}

const encodeHeader = (value: string) =>
  `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;

const base64Body = (value: string) => {
  const encoded = Buffer.from(value.replace(/\r?\n/g, '\r\n'), 'utf8').toString('base64');
  return encoded.match(/.{1,76}/g)?.join('\r\n') || '';
};

const parseAddress = (value: string) => {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).trim();
};

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
  !/[\r\n]/.test(email);

const constantTimeEqual = (left: string, right: string) => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};

const assertResponse = (
  response: SmtpResponse,
  expected: number | number[],
  action: string,
) => {
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (!allowed.includes(response.code)) {
    throw new Error(
      `SMTP ${action} failed with ${response.code}: ${response.lines.join(' | ')}`,
    );
  }
};

const command = async (
  socket: tls.TLSSocket,
  reader: SmtpReader,
  value: string,
  expected: number | number[],
  action: string,
) => {
  socket.write(`${value}\r\n`);
  const response = await reader.response();
  assertResponse(response, expected, action);
  return response;
};

async function sendSmtpMail(to: string, subject: string, text: string) {
  if (!SMTP_PASS) throw new Error('SMTP_PASS is not configured');

  const socket = tls.connect({
    host: SMTP_HOST,
    port: SMTP_PORT,
    servername: SMTP_HOST,
    rejectUnauthorized: true,
  });
  socket.setTimeout(20_000);

  const reader = new SmtpReader(socket);

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      socket.off('secureConnect', onSecure);
      reject(error);
    };
    const onSecure = () => {
      socket.off('error', onError);
      resolve();
    };

    socket.once('secureConnect', onSecure);
    socket.once('error', onError);
  });

  try {
    assertResponse(await reader.response(), 220, 'greeting');
    await command(socket, reader, 'EHLO harkasit.nl', 250, 'EHLO');
    await command(socket, reader, 'AUTH LOGIN', 334, 'AUTH LOGIN');
    await command(
      socket,
      reader,
      Buffer.from(SMTP_USER, 'utf8').toString('base64'),
      334,
      'username',
    );
    await command(
      socket,
      reader,
      Buffer.from(SMTP_PASS, 'utf8').toString('base64'),
      235,
      'password',
    );

    const fromAddress = parseAddress(SMTP_USER);
    await command(
      socket,
      reader,
      `MAIL FROM:<${fromAddress}>`,
      250,
      'MAIL FROM',
    );
    await command(socket, reader, `RCPT TO:<${to}>`, [250, 251], 'RCPT TO');
    await command(socket, reader, 'DATA', 354, 'DATA');

    const messageId = `<${randomUUID()}@harkasit.nl>`;
    const headers = [
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: ${messageId}`,
      `From: ${encodeHeader(SMTP_FROM_NAME)} <${fromAddress}>`,
      `To: <${to}>`,
      `Reply-To: <${SMTP_REPLY_TO}>`,
      `Subject: ${encodeHeader(subject)}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
    ];

    const mime = `${headers.join('\r\n')}\r\n\r\n${base64Body(text)}\r\n.\r\n`;
    socket.write(mime);
    assertResponse(await reader.response(), 250, 'message delivery');

    socket.write('QUIT\r\n');

    return messageId;
  } finally {
    socket.end();
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const expectedAuth = `Bearer ${SMTP_API_TOKEN}`;
  const receivedAuth = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization || '';

  if (
    !SMTP_API_TOKEN ||
    !receivedAuth ||
    !constantTimeEqual(receivedAuth, expectedAuth)
  ) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      configured: Boolean(SMTP_PASS),
      host: SMTP_HOST,
      port: SMTP_PORT,
      sender: SMTP_USER,
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, text } = req.body || {};
  const cleanTo = String(to || '').trim();
  const cleanSubject = String(subject || '').trim();
  const cleanText = String(text || '').trim();

  if (
    !isValidEmail(cleanTo) ||
    !cleanSubject ||
    !cleanText ||
    cleanSubject.length > 250 ||
    cleanText.length > 50_000 ||
    /[\r\n]/.test(cleanSubject)
  ) {
    return res.status(400).json({ error: 'Invalid email payload' });
  }

  try {
    const messageId = await sendSmtpMail(cleanTo, cleanSubject, cleanText);
    return res.status(200).json({ ok: true, messageId });
  } catch (error) {
    console.error(
      'SMTP send failed',
      error instanceof Error ? error.message : error,
    );
    return res.status(502).json({ error: 'SMTP send failed' });
  }
}
