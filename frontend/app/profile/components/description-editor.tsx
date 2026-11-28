'use client';
import { useState } from 'react';
import type { FormEvent } from 'react';

const MAX = 80;

// US-7-T-5: the description beside the name, in a fixed two-line slot so
// opening the editor never moves the page. On your own profile a pencil (or
// "Add a short description" when it's empty) opens an inline field with a
// live count; Enter submits the form and Esc cancels. The description is
// always React text, never HTML.
export default function DescriptionSlot({ text, onSave }: {
	text: string;
	// Absent on someone else's profile: no edit controls.
	onSave?: (_description: string) => Promise<boolean>;
}) {
	const [draft, setDraft] = useState<string | null>(null);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (onSave && draft !== null && (await onSave(draft.trim()))) setDraft(null);
	}

	let content;
	if (onSave && draft !== null) {
		content = (
			<form className="lb-pc-pop flex max-w-[720px] items-center gap-2" autoComplete="off" onSubmit={submit}>
				<label htmlFor="lb-pc-description" className="sr-only">Description</label>
				<span className="relative flex min-w-0 flex-1">
					<input
						id="lb-pc-description"
						autoFocus
						onFocus={(event) => event.currentTarget.select()}
						value={draft}
						maxLength={MAX}
						placeholder="A line about you"
						onChange={(event) => setDraft(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === 'Escape') {
								event.stopPropagation();
								setDraft(null);
							}
						}}
						className="h-12 min-w-0 flex-1 rounded-lg border border-primary bg-surface pl-4 pr-[76px] text-[clamp(16px,1.2vw,18px)] font-medium text-ink outline-none"
					/>
					<span aria-live="polite" className={`pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs ${draft.length >= MAX - 8 ? 'text-secondary' : 'text-muted'}`}>
						{draft.length} / {MAX}
					</span>
				</span>
				<button type="button" onClick={() => setDraft(null)} className="lb-pc-small h-12 rounded-lg border border-line px-[18px] text-sm font-bold text-ink">Cancel</button>
				<button type="submit" className="lb-pc-small lb-pc-save h-12 rounded-lg border border-primary bg-primary px-[18px] text-sm font-bold text-on-primary">Save</button>
			</form>
		);
	} else if (text) {
		content = (
			<div className="flex items-center gap-2.5">
				<p className="lb-pc-bio">{text}</p>
				{onSave && (
					<button type="button" aria-label="Edit description" onClick={() => setDraft(text)} className="lb-pc-pencil">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z M13.5 6.5l4 4" /></svg>
					</button>
				)}
			</div>
		);
	} else if (onSave) {
		content = <button type="button" onClick={() => setDraft('')} className="lb-pc-bio-add">Add a short description</button>;
	}

	return <div className="lb-pc-bio-slot">{content}</div>;
}
