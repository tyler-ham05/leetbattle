'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useAuth } from '../auth/context';
import { AuthCard, AuthField, AuthMessage, AuthSubmitButton } from '../auth/components';

export default function LoginPage() {
	const { login } = useAuth();
	const router = useRouter();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const onSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError(null);
		setIsSubmitting(true);
		try {
			await login(email, password);
			router.push('/editor');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'failed to log in');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<AuthCard title="Log in">
			<form onSubmit={onSubmit} className="flex flex-col gap-4">
				<AuthField
					label="Email"
					type="email"
					required
					value={email}
					onChange={(e) => setEmail(e.target.value)}
				/>
				<AuthField
					label="Password"
					type="password"
					required
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>

				<AuthMessage error={error} />

				<AuthSubmitButton pending={isSubmitting} pendingLabel="Logging in…">
					Log in
				</AuthSubmitButton>

				<div className="flex justify-between text-sm">
					<Link href="/signup" className="underline">
						Need an account?
					</Link>
					<Link href="/forgot-password" className="underline">
						Forgot password?
					</Link>
				</div>
			</form>
		</AuthCard>
	);
}
