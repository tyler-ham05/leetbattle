'use client';
import { InputHTMLAttributes, ReactNode } from 'react';

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
			<div className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-black">
				<h1 className="text-xl font-semibold">{title}</h1>
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
		<label className="flex flex-col gap-1 text-sm">
			{label}
			<input
				{...inputProps}
				className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
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
			className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
		>
			{pending ? pendingLabel : children}
		</button>
	);
}

export function AuthMessage({ error, success }: { error?: string | null; success?: string | null }) {
	if (error) {
		return <p className="text-sm text-red-600">{error}</p>;
	}
	if (success) {
		return <p className="text-sm text-green-600">{success}</p>;
	}
	return null;
}
