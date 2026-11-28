'use client';
import { Fragment } from 'react';
import type { CSSProperties } from 'react';

// Width of a row of names in em (capitals, heaviest weight): its letters, the
// bars between names, the padding and the YOU tag. Both rows use one font size,
// the screen width divided by the widest row, so long usernames shrink to fit.
export function rowEm(names: string[]) {
	const letters = names.join('').length;
	return Math.round((letters * 0.68 + (names.length - 1) * 0.9 + 1.5) * 100) / 100;
}

// One team: the names in a line with thin bars between them, the player's own
// name tagged YOU, and faded copies on both sides as it sweeps past.
function TeamRow({ which, names, you }: { which: 'mine' | 'rivals'; names: string[]; you?: string }) {
	const youAt = you ? names.indexOf(you) : -1;
	const copy = names.join('   ');
	return (
		<div data-row={which} className={`lb-ms-row lb-ms-${which} ${which === 'mine' ? 'text-primary' : 'text-secondary'}`}>
			<span className="lb-ms-rep">{copy}</span>
			<span className="lb-ms-main">
				{names.map((name, index) => (
					<Fragment key={`${index}-${name}`}>
						{index > 0 && <span data-sep="bar" className="lb-ms-sep" />}
						<span data-name="">{name}</span>
						{index === youAt && <span data-you="" className="lb-ms-you rounded-[7px] bg-primary font-mono text-on-primary">YOU</span>}
					</Fragment>
				))}
			</span>
			<span className="lb-ms-rep">{copy}</span>
		</div>
	);
}

// The screen between the Ladder and the game: every player's name, the
// player's team above and the rivals below, and a VS that spins in and is
// sliced. It plays for about 2.7 seconds; the page opens the game after it.
// Without names (an older QueueService), the rows read "Your team" / "Rivals".
export default function MatchStart({ yourTeam, rivals, you }: { yourTeam?: string[]; rivals?: string[]; you?: string }) {
	const mine = yourTeam?.length ? yourTeam : ['Your team'];
	const theirs = rivals?.length ? rivals : ['Rivals'];
	const style = { '--lb-ms-em': Math.max(rowEm(mine), rowEm(theirs)) } as CSSProperties;

	return (
		<div data-testid="match-start" className="lb-ms fixed inset-0 z-50 overflow-hidden bg-page text-ink" style={style}>
			<p className="sr-only" aria-live="assertive">{`Match starting: ${mine.join(', ')} against ${theirs.join(', ')}`}</p>
			<div aria-hidden="true">
				<TeamRow which="mine" names={mine} you={you} />
				<div className="lb-ms-vs">
					<div className="lb-ms-spin">
						<span className="lb-ms-part lb-ms-whole">VS</span>
						<span className="lb-ms-part lb-ms-half lb-ms-top">VS</span>
						<span className="lb-ms-part lb-ms-half lb-ms-bottom">VS</span>
					</div>
					<div className="lb-ms-cut"><span className="lb-ms-blade" /></div>
				</div>
				<TeamRow which="rivals" names={theirs} />
			</div>
		</div>
	);
}
