'use client';
import { useRouter } from 'next/navigation';
import { SubmitEvent, useEffect, useState } from 'react';
import { useAuth } from './context';
import PageLoader from '../_shared/page-loader';
import HomeTopBar from '../_home/components/topbar';
import { AuthAPIService } from './controller';
import { AuthCard, AuthCheck, AuthField, AuthMessage, AuthSubmitButton, AuthTabs, AuthTextButton, PasswordStrength } from './components/components';

const RESEND_SECONDS = 30;

// "Resend in 0:30", counting down, then a "Resend link" button.
function ResendButton({ onResend }: { onResend: () => void }) {
	const [left, setLeft] = useState(RESEND_SECONDS);
	const counting = left > 0;

	// One interval per countdown; it stops itself at zero.
	useEffect(() => {
		if (!counting) return;
		const timer = setInterval(() => setLeft((value) => Math.max(0, value - 1)), 1_000);
		return () => clearInterval(timer);
	}, [counting]);

	const label = left > 0 ? `Resend in 0:${String(left).padStart(2, '0')}` : 'Resend link';
	return (
		<button
			type="button"
			disabled={left > 0}
			onClick={() => {
				onResend();
				setLeft(RESEND_SECONDS);
			}}
			className="lb-press h-[46px] w-full rounded-lg border border-line text-sm font-semibold text-ink hover:bg-raised disabled:cursor-default disabled:text-muted disabled:hover:bg-transparent"
		>
			{label}
		</button>
	);
}

type Mode = 'login' | 'signup' | 'forgot' | 'sent';

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
			if (mode === 'forgot') {
				await new AuthAPIService().requestPasswordReset(email);
				setMode('sent');
				return;
			}
			if (mode === 'signup') {
				await signup(email, password, name);
			} else {
				await login(email, password);
			}
			router.push('/');
		} catch (err) {
			setError(err instanceof Error ? err.message : `failed to ${mode === 'signup' ? 'sign up' : mode === 'forgot' ? 'send the reset link' : 'log in'}`);
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

	const backToLogin = () => {
		setError(null);
		setMode('login');
	};

	if (mode === 'sent') {
		return (
			<>
				<PageLoader variant="pen" />
				<HomeTopBar />
				<AuthCard title="Check your email">
					<div className="flex flex-col gap-4">
						<AuthCheck />
						<p role="status" className="lb-rise text-sm text-muted" style={{ animationDelay: '0.35s' }}>
							If an account exists for that address, a reset link is on its way. The link works for 30 minutes.
						</p>
						<div className="lb-rise flex flex-col gap-3" style={{ animationDelay: '0.5s' }}>
							<ResendButton onResend={() => new AuthAPIService().requestPasswordReset(email).catch(() => undefined)} />
							<AuthTextButton onClick={() => setMode('forgot')}>Use a different email</AuthTextButton>
							<AuthTextButton onClick={backToLogin}>Back to log in</AuthTextButton>
						</div>
					</div>
				</AuthCard>
			</>
		);
	}

	if (mode === 'forgot') {
		return (
			<>
				<PageLoader variant="pen" />
				<HomeTopBar />
				<AuthCard title="Reset your password">
					<form onSubmit={onSubmit} className="flex flex-col gap-4">
						<p className="text-sm text-muted">Enter your email and we will send you a link to choose a new password.</p>
						<AuthField label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
						<AuthMessage status={error ? { type: 'error', text: error } : null} />
						<AuthSubmitButton pending={isSubmitting} pendingLabel="Sending…">Send reset link</AuthSubmitButton>
						<AuthTextButton onClick={backToLogin}>Back to log in</AuthTextButton>
					</form>
				</AuthCard>
			</>
		);
	}

	return (
		<>
			<PageLoader variant="pen" />
			<HomeTopBar />
			<AuthCard title={mode === 'signup' ? 'Sign up' : 'Log in'}>
				<AuthTabs
					signup={mode === 'signup'}
					onChange={(toSignup) => {
						setError(null);
						setMode(toSignup ? 'signup' : 'login');
					}}
				/>
				<form onSubmit={onSubmit} className="flex flex-col gap-4">
					{/* The Name field folds open and shut instead of popping in. */}
					<div
						data-collapsed={String(mode !== 'signup')}
						inert={mode !== 'signup'}
						className={`-mb-4 grid transition-[grid-template-rows,opacity] duration-[450ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] ${mode === 'signup' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
					>
						<div className="overflow-hidden">
							<div className="pb-4">
								<AuthField
									label="Name"
									type="text"
									required
									disabled={mode !== 'signup'}
									value={name}
									onChange={(e) => setName(e.target.value)}
								/>
							</div>
						</div>
					</div>
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
					{mode === 'signup' && <PasswordStrength password={password} />}
					{mode === 'login' && (
						<AuthTextButton
							className="-mt-2 self-end"
							onClick={() => {
								setError(null);
								setMode('forgot');
							}}
						>
							Forgot password?
						</AuthTextButton>
					)}

					<AuthMessage status={error ? { type: 'error', text: error } : null} />

					<AuthSubmitButton pending={isSubmitting} pendingLabel={mode === 'signup' ? 'Signing up…' : 'Logging in…'}>
						{mode === 'signup' ? 'Sign up' : 'Log in'}
					</AuthSubmitButton>

				</form>
			</AuthCard>
		</>
	);
}
