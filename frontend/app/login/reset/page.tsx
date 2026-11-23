'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import type { SubmitEvent } from 'react';
import HomeTopBar from '../../_home/components/topbar';
import { AuthAPIService } from '../controller';
import { AuthCard, AuthCheck, AuthField, AuthMessage, AuthSubmitButton } from '../components/components';

function ResetForm() {
	const token = useSearchParams().get('token');
	const [newPassword, setNewPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [done, setDone] = useState(false);

	const onSubmit = async (e: SubmitEvent) => {
		e.preventDefault();
		setError(null);
		setIsSubmitting(true);
		try {
			await new AuthAPIService().resetPassword(token ?? '', newPassword);
			setDone(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'failed to change password');
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!token) {
		return (
			<AuthCard title="Reset your password">
				<p className="text-sm text-danger">This reset link is not valid.</p>
			</AuthCard>
		);
	}

	if (done) {
		return (
			<AuthCard title="Password changed">
				<AuthCheck />
				<Link href="/login" className="flex h-[46px] w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-on-primary">
					Log in
				</Link>
			</AuthCard>
		);
	}

	return (
		<AuthCard title="Choose a new password">
			<form onSubmit={onSubmit} className="flex flex-col gap-4">
				<AuthField
					label="New password"
					type="password"
					required
					minLength={8}
					value={newPassword}
					onChange={(e) => setNewPassword(e.target.value)}
				/>
				<AuthMessage status={error ? { type: 'error', text: error } : null} />
				<AuthSubmitButton pending={isSubmitting} pendingLabel="Changing">Change password</AuthSubmitButton>
			</form>
		</AuthCard>
	);
}

export default function ResetPasswordPage() {
	return (
		<>
			<HomeTopBar />
			<Suspense>
				<ResetForm />
			</Suspense>
		</>
	);
}
