'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AuthAPIService } from '../auth/controller';
import { useAuth } from '../auth/context';
import { AuthCard, AuthMessage } from '../auth/components';

function VerifyEmailStatus() {
	const searchParams = useSearchParams();
	const token = searchParams.get('token') ?? '';
	const { refresh } = useAuth();
	const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!token) {
			setStatus('error');
			setError('Missing verification token.');
			return;
		}
		const api = new AuthAPIService();
		api
			.verifyEmail(token)
			.then(() => {
				setStatus('success');
				return refresh();
			})
			.catch((err) => {
				setStatus('error');
				setError(err instanceof Error ? err.message : 'failed to verify email');
			});
	}, [token, refresh]);

	if (status === 'pending') {
		return <p className="text-sm">Verifying your email…</p>;
	}
	if (status === 'error') {
		return <AuthMessage error={error} />;
	}
	return <AuthMessage success="Your email has been verified." />;
}

export default function VerifyEmailPage() {
	return (
		<AuthCard title="Verify email">
			<Suspense fallback={null}>
				<VerifyEmailStatus />
			</Suspense>
			<Link href="/editor" className="text-sm underline">
				Go to editor
			</Link>
		</AuthCard>
	);
}
