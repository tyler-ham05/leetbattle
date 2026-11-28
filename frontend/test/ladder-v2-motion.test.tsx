// US-10-T-10: motion rules for the Ladder launcher and the match-start screen.
// Pseudocode: test/ladder-v2-test-pseudo.md, "Motion rules (globals.css)".
// Every new animation needs a prefers-reduced-motion override. Reads globals.css only.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const css = fs.readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8');

// Everything inside the reduced-motion media blocks, joined.
function reducedMotionRules() {
	return css.split('@media (prefers-reduced-motion: reduce)').slice(1).join('\n');
}

describe('US-10-T-10 motion rules', () => {
	it('US-10-T-10 calms the team columns sliding in under reduced motion', () => {
		expect(reducedMotionRules()).toContain('.lb-lad-side');
	});

	it('US-10-T-10 calms the background team size under reduced motion', () => {
		expect(reducedMotionRules()).toContain('.lb-lad-giant');
	});

	it('US-10-T-10 stops the match-start rows sweeping under reduced motion', () => {
		expect(reducedMotionRules()).toContain('.lb-ms-row');
	});

	it('US-10-T-10 stops the VS spin under reduced motion', () => {
		expect(reducedMotionRules()).toContain('.lb-ms-spin');
	});

	it('US-10-T-10 hides the VS blade under reduced motion', () => {
		expect(reducedMotionRules()).toMatch(/\.lb-ms-cut[^{]*\{[^}]*display:\s*none/);
	});

	// A finished animation that still holds transform overrides :hover, which
	// cancelled PLAY's lift. Filling backwards keeps the start state, not the end.
	it('US-10-T-10 lets lb-enter release the element once it ends', () => {
		expect(css).toMatch(/\.lb-enter\s*\{\s*animation:\s*lb-enter\s+160ms\s+ease-out\s+backwards;/);
	});

	it('US-10-T-10 shows only the whole VS under reduced motion', () => {
		// The two cut halves are hidden, so the VS never splits.
		expect(reducedMotionRules()).toMatch(/\.lb-ms-half[^{]*\{[^}]*display:\s*none/);
	});
});
