'use client';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { AuthAPIService } from '../auth/controller';
import { AuthCard, AuthField, AuthMessage, AuthSubmitButton } from '../auth/components';

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState('');
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const onSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError(null);
		setMessage(null);
		setIsSubmitting(true);
		try {
			const api = new AuthAPIService();
			await api.requestPasswordReset(email);
			setMessage('If that email has an account, a reset link has been sent.');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'failed to request password reset');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<AuthCard title="Forgot password">
			<form onSubmit={onSubmit} className="flex flex-col gap-4">
				<AuthField
					label="Email"
					type="email"
					required
					value={email}
					onChange={(e) => setEmail(e.target.value)}
				/>

				<AuthMessage error={error} success={message} />

				<AuthSubmitButton pending={isSubmitting} pendingLabel="Sending…">
					Send reset link
				</AuthSubmitButton>

				<Link href="/login" className="text-sm underline">
					Back to log in
				</Link>
			</form>
		</AuthCard>
	);
}
