import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { z } from "zod";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("A valid email is required").max(200),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  message: z.string().trim().min(10, "Message is too short").max(5000),
  /** Honeypot: bots fill hidden fields, humans never see them. */
  company: z.string().max(0).optional(),
});

const RATE_LIMIT = { limit: 5, windowMs: 60 * 60 * 1000 };

/** Strip CR/LF so user input cannot inject extra SMTP headers. */
function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "contact"), RATE_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many messages. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Please check the form and try again.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { name, email, subject, message, company } = parsed.data;

  // Honeypot tripped — accept silently so bots get no signal to adapt.
  if (company) {
    return NextResponse.json({ success: true, name });
  }

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.error("Contact form: EMAIL_USER/EMAIL_PASS are not configured.");
    return NextResponse.json(
      { success: false, error: "Messaging is temporarily unavailable." },
      { status: 503 },
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      // Send as the mailbox owner so SPF/DKIM pass; reply-to carries the sender.
      from: user,
      to: user,
      replyTo: `${sanitizeHeader(name)} <${sanitizeHeader(email)}>`,
      subject: `Portfolio enquiry: ${sanitizeHeader(subject)}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    });

    return NextResponse.json({ success: true, name });
  } catch (error) {
    // Log server-side; never surface transport internals to the client.
    console.error("Contact form: failed to send mail.", error);
    return NextResponse.json(
      { success: false, error: "Could not send your message. Please try again." },
      { status: 502 },
    );
  }
}
