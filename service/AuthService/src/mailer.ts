// Dev-only mailer: logs the email instead of sending it, so password reset
// and email verification flows can be tested locally without SMTP
// credentials. Swap this out for a real provider before relying on it in
// production.
export function sendMail(to: string, subject: string, body: string) {
	console.log(`[auth-service] mail -> ${to}\nSubject: ${subject}\n\n${body}`);
}
