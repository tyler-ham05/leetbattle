'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { AuthAPIService } from '../auth/controller';
import { AuthCard, AuthField, AuthMessage, AuthSubmitButton } from '../auth/components';

function ResetPasswordForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get('token') ?? '';
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const onSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError(null);
		setIsSubmitting(true);
		try {
			const api = new AuthAPIService();
			await api.resetPassword(token, password);
			router.push('/login');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'failed to reset password');
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!token) {
		return <AuthMessage error="Missing reset token. Use the link from your password reset email." />;
	}

	return (
		<form onSubmit={onSubmit} className="flex flex-col gap-4">
			<AuthField
				label="New password"
				type="password"
				required
				minLength={8}
				value={password}
				onChange={(e) => setPassword(e.target.value)}
			/>

			<AuthMessage error={error} />

			<AuthSubmitButton pending={isSubmitting} pendingLabel="Resetting…">
				Reset password
			</AuthSubmitButton>

			<Link href="/login" className="text-sm underline">
				Back to log in
			</Link>
		</form>
	);
}

export default function ResetPasswordPage() {
	return (
		<AuthCard title="Reset password">
			<Suspense fallback={null}>
				<ResetPasswordForm />
			</Suspense>
		</AuthCard>
	);
}
