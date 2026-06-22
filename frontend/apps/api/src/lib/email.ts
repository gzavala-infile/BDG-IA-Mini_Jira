import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env['SMTP_HOST'] ?? 'smtp.mailtrap.io',
  port: Number(process.env['SMTP_PORT'] ?? 2525),
  auth: {
    user: process.env['SMTP_USER'] ?? '',
    pass: process.env['SMTP_PASS'] ?? '',
  },
});

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  await transporter.sendMail({
    from: process.env['SMTP_FROM'] ?? 'noreply@mini-jira.internal',
    to,
    subject,
    html,
  });
}

export async function notifyAsignacion(email: string, titulo: string): Promise<void> {
  await sendEmail(email, `Te asignaron: ${titulo}`, `<p>Se te asignó el ticket <strong>${titulo}</strong>.</p>`);
}

export async function notifyComentario(email: string, titulo: string, autor: string): Promise<void> {
  await sendEmail(email, `Nuevo comentario en: ${titulo}`, `<p><strong>${autor}</strong> comentó en tu ticket <strong>${titulo}</strong>.</p>`);
}

export async function notifyMencion(email: string, titulo: string, autor: string): Promise<void> {
  await sendEmail(email, `Te mencionaron en: ${titulo}`, `<p><strong>${autor}</strong> te mencionó en el ticket <strong>${titulo}</strong>.</p>`);
}

export async function notifyCambioEstado(email: string, titulo: string, estado: string): Promise<void> {
  await sendEmail(email, `Estado actualizado: ${titulo}`, `<p>El ticket <strong>${titulo}</strong> cambió a estado <strong>${estado}</strong>.</p>`);
}
