'use client';
import { useRouter } from 'next/navigation';
import { SubmitEvent, useEffect, useState } from 'react';
import { useAuth } from './context';
import { AuthCard, AuthField, AuthMessage, AuthSubmitButton } from './components/components';

type Mode = 'login' | 'signup';

export default function LoginPage() {
	const { login, signup, user, isLoading } = useAuth();
	const router = useRouter();
	const [mode, setMode] = useState<Mode>('login');
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const onSubmit = async (e: SubmitEvent) => {
		e.preventDefault();
		setError(null);
		setIsSubmitting(true);
		try {
			if (mode === 'signup') {
				await signup(email, password, name);
			} else {
				await login(email, password);
			}
			router.push('/');
		} catch (err) {
			setError(err instanceof Error ? err.message : `failed to ${mode === 'signup' ? 'sign up' : 'log in'}`);
		} finally {
			setIsSubmitting(false);
		}
	};

	useEffect(() => {
		if (user) {
			router.push('/');
		}
	}, [user, router]);

	if (isLoading || user) {
		return null;
	}

	return (
		<AuthCard title={mode === 'signup' ? 'Sign up' : 'Log in'}>
			<form onSubmit={onSubmit} className="flex flex-col gap-4">
				{mode === 'signup' && (
					<AuthField
						label="Name"
						type="text"
						required
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				)}
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
					minLength={mode === 'signup' ? 8 : undefined}
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>

				<AuthMessage status={error ? { type: 'error', text: error } : null} />

				<AuthSubmitButton pending={isSubmitting} pendingLabel={mode === 'signup' ? 'Signing up…' : 'Logging in…'}>
					{mode === 'signup' ? 'Sign up' : 'Log in'}
				</AuthSubmitButton>

				<button
					type="button"
					onClick={() => {
						setError(null);
						setMode(mode === 'signup' ? 'login' : 'signup');
					}}
					className="text-sm underline"
				>
					{mode === 'signup' ? 'Already have an account?' : 'Need an account?'}
				</button>
			</form>
		</AuthCard>
	);
}
