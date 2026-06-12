import nodemailer from "nodemailer";
import { isSmtpConfigured } from "@/lib/smtp";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function sendTransactionalEmail({ to, subject, text, html }: SendEmailInput) {
  if (!isSmtpConfigured()) {
    return { sent: false };
  }

  const transport = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
    secure: Number(process.env.EMAIL_SERVER_PORT ?? 587) === 465,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });

  await transport.sendMail({
    to,
    from: process.env.EMAIL_FROM,
    subject,
    text,
    html,
  });

  return { sent: true };
}
