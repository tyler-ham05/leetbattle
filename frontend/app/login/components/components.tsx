'use client';
import { InputHTMLAttributes, ReactNode } from 'react';

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div className="flex flex-1 items-center justify-center bg-page font-sans">
			<div className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-line bg-surface p-8">
				<h1 className="text-xl font-semibold text-ink">{title}</h1>
				{children}
			</div>
		</div>
	);
}

export function AuthField({
	label,
	...inputProps
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
	return (
		<label className="flex flex-col gap-1 text-sm text-ink">
			{label}
			<input
				{...inputProps}
				className="rounded border border-line bg-surface px-3 py-2 text-ink"
			/>
		</label>
	);
}

export function AuthSubmitButton({ pending, pendingLabel, children }: {
	pending: boolean;
	pendingLabel: string;
	children: ReactNode;
}) {
	return (
		<button
			type="submit"
			disabled={pending}
			className="rounded bg-primary px-3 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
		>
			{pending ? pendingLabel : children}
		</button>
	);
}

export interface AuthStatus {
	type: 'success' | 'error';
	text: string;
}

export function AuthMessage({ status }: { status?: AuthStatus | null }) {
	if (!status) {
		return null;
	}
	const color = status.type === 'error' ? 'text-danger' : 'text-green-600 dark:text-green-400';
	return <p className={`text-sm ${color}`}>{status.text}</p>;
}
