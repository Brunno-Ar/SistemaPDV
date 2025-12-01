import nodemailer from "nodemailer";

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  // Check if email configuration is present
  if (
    !process.env.EMAIL_SERVER_HOST ||
    !process.env.EMAIL_SERVER_USER ||
    !process.env.EMAIL_SERVER_PASSWORD
  ) {
    console.log("⚠️ Email configuration missing. Logging email to console.");
    console.log(`
      --- EMAIL SIMULATION ---
      To: ${to}
      Subject: ${subject}
      Text: ${text}
      ------------------------
    `);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT) || 587,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
    secure: Number(process.env.EMAIL_SERVER_PORT) === 465,
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "noreply@flowpdv.com",
      to,
      subject,
      text,
      html,
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  const confirmLink = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`;

  await sendEmail({
    to: email,
    subject: "Confirme seu email - Flow PDV",
    text: `Por favor, confirme seu email clicando no link: ${confirmLink}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #2563eb;">Confirme seu email</h2>
        <p>Obrigado por se cadastrar no Flow PDV. Para ativar sua conta, por favor confirme seu endereço de email.</p>
        <a href="${confirmLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">Confirmar Email</a>
        <p style="font-size: 14px;">Ou copie e cole este link no seu navegador:</p>
        <p style="font-size: 12px; color: #666;">${confirmLink}</p>
      </div>
    `,
  });
}
