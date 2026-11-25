'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RequireAuth from '../login/protected';
import HomeTopBar from '../_home/components/topbar';
import { useQueueSocket } from './socket-context';
import type { QueueMode } from './socket-context';

const QUEUE_MODES: QueueMode[] = ['1v1', '2v2', '3v3'];
const BUTTON = 'lb-press inline-flex h-9 items-center justify-center rounded-lg px-4 text-[13px] font-semibold disabled:cursor-not-allowed';

function Ladder() {
	const router = useRouter();
	const { socket, connected, queue, matched, error, connect } = useQueueSocket();
	const waitingIn = queue?.queue ?? null;

	useEffect(() => {
		connect();
	}, [connect]);

	useEffect(() => {
		if (matched) router.push(`/game/${matched.gameId}`);
	}, [matched, router]);

	return (
		<div className="flex flex-1 flex-col">
			<HomeTopBar />
			<main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pt-14 pb-16">
				<h1 className="m-0 text-4xl font-black tracking-[-0.04em]">Ladder</h1>
				<p className="mt-2 text-muted">Join a queue. The match starts as soon as there are enough players.</p>
				<ul className="mt-8 flex list-none flex-col gap-2 p-0">
					{QUEUE_MODES.map((mode) => (
						<li key={mode} className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3">
							<span className="flex items-baseline gap-3">
								<span className="text-lg font-bold">{mode}</span>
								<span className="text-sm text-muted">{queue?.counts[mode] ?? 0} waiting</span>
							</span>
							<button
								type="button"
								onClick={() => socket?.emit('queue:join', mode)}
								disabled={!connected || waitingIn === mode}
								className={`${BUTTON} lb-press-lift bg-primary text-on-primary disabled:opacity-40`}
							>
								Join {mode}
							</button>
						</li>
					))}
				</ul>
				{waitingIn && (
					<div className="mt-6 flex items-center justify-between rounded-xl border border-line px-4 py-3">
						<span className="text-ink">Waiting for a {waitingIn} match…</span>
						<button
							type="button"
							onClick={() => socket?.emit('queue:leave')}
							className={`${BUTTON} border border-line text-ink hover:bg-raised`}
						>
							Leave queue
						</button>
					</div>
				)}
				{error && <div role="alert" className="mt-6 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error.message}</div>}
			</main>
		</div>
	);
}

export default function LadderPage() {
	return (
		<RequireAuth>
			<Ladder />
		</RequireAuth>
	);
}
