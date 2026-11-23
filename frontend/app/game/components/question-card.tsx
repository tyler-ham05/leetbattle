// The parts the ban and pick screens share (US-5-T-22): the screen around the
// question grid (heading, intro, a plain "2 of 4 bans made" count and the
// status line) and one question card, shown by number and topics only.
'use client';

import type { ReactNode } from 'react';

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
export const inWords = (count: number) => NUMBER_WORDS[count] ?? String(count);
export const capitalise = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

const CARD = 'relative flex min-h-[168px] w-full flex-col justify-between gap-5 overflow-hidden rounded-xl p-5 text-left';

export function ChoiceScreen({ title, intro, progress, status, children }: {
	title: string;
	intro: ReactNode;
	// The plain count of choices made, e.g. "2 of 4 bans made".
	progress: string;
	status: string;
	children: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-8">
			<header className="flex flex-col gap-2">
				<h2 className="text-4xl font-extrabold leading-[1.05] tracking-[-0.035em]">{title}</h2>
				<p className="text-[15px] text-muted">{intro}</p>
			</header>

			<div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-line pb-5">
				<span className="text-sm font-semibold">{progress}</span>
				<p role="status" aria-live="polite" className="text-sm text-muted">{status}</p>
			</div>

			<ul aria-label="Questions" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{children}
			</ul>
		</section>
	);
}

interface QuestionCardProps {
	position: number;
	topics: string[];
	// taken: banned or picked (dashed, topics struck through); open: still in
	// play but this player can't choose it; choose: a button that calls onChoose.
	state: 'taken' | 'open' | 'choose';
	// The line along the bottom of the card ("Banned by Grace", "Available", ...).
	footer: ReactNode;
	onChoose?: () => void;
	// A line strikes across the card as it lands (a ban).
	strike?: boolean;
}

export function QuestionCard({ position, topics, state, footer, onChoose, strike = false }: QuestionCardProps) {
	const taken = state === 'taken';
	const label = taken ? 'border border-line font-medium text-muted line-through' : 'bg-raised font-semibold';
	const body = (
		<>
			<span className="flex flex-col gap-3.5">
				<span data-testid="question-label" className="text-sm font-medium text-muted">Question {position}</span>
				<span className="flex flex-wrap gap-2">
					{topics.map((topic) => (
						<span key={topic} data-testid="topic" className={`rounded-md px-2.5 py-1 text-[15px] ${label}`}>{topic}</span>
					))}
				</span>
			</span>
			{footer}
			{strike && <span aria-hidden="true" data-testid="ban-strike" className="lb-ban-strike pointer-events-none absolute inset-x-5 top-1/2 h-0.5 bg-danger/70" />}
		</>
	);

	if (state === 'choose') {
		return (
			<li className="flex">
				<button onClick={onChoose} className={`lb-press ${CARD} border border-line bg-surface hover:bg-raised`}>{body}</button>
			</li>
		);
	}
	return <li className={`${CARD} border border-line ${taken ? 'border-dashed' : 'bg-surface'}`}>{body}</li>;
}
