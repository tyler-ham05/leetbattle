'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useAuth } from '../auth/context';
import { AuthCard, AuthField, AuthMessage, AuthSubmitButton } from '../auth/components';

export default function SignupPage() {
	const { signup } = useAuth();
	const router = useRouter();
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const onSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError(null);
		setIsSubmitting(true);
		try {
			await signup(email, password, name);
			router.push('/editor');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'failed to sign up');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<AuthCard title="Sign up">
			<form onSubmit={onSubmit} className="flex flex-col gap-4">
				<AuthField
					label="Name"
					type="text"
					required
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
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
					minLength={8}
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>

				<AuthMessage error={error} />

				<AuthSubmitButton pending={isSubmitting} pendingLabel="Signing up…">
					Sign up
				</AuthSubmitButton>

				<Link href="/login" className="text-sm underline">
					Already have an account?
				</Link>
			</form>
		</AuthCard>
	);
}
