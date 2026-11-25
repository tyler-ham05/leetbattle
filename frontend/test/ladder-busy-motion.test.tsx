// US-10-T-9: motion rules for the Ladder reveal and the Run/Submit feedback.
// Pseudocode: test/ladder-busy-test-pseudo.md, "Motion rules (globals.css)".
// Every new animation needs a prefers-reduced-motion override, and the
// buttons' fail shake reuses the wrong-password shake. Reads globals.css only.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const css = fs.readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8');

// Everything inside the reduced-motion media blocks, joined.
function reducedMotionRules() {
	return css.split('@media (prefers-reduced-motion: reduce)').slice(1).join('\n');
}

// The body of the first CSS rule whose selector matches exactly.
function rule(selector: string) {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return css.match(new RegExp(`(^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`, 'm'))?.[2] ?? '';
}

describe('US-10-T-9 motion rules', () => {
	it('US-10-T-9 turns the edge light (lb-trace) down under reduced motion', () => {
		expect(reducedMotionRules()).toContain('.lb-trace');
	});

	it('US-10-T-9 turns the nod (lb-nod) off under reduced motion', () => {
		expect(reducedMotionRules()).toContain('.lb-nod');
	});

	it('US-10-T-9 shakes buttons with the wrong-password keyframes (lb-shake)', () => {
		expect(rule('.lb-shake')).toContain('lb-shake');
	});

	it('US-10-T-9 turns the Ladder cards leaving off under reduced motion', () => {
		expect(reducedMotionRules()).toContain('.lb-card-leaving');
	});

	it('US-10-T-9 turns the chosen Ladder card gliding to the middle off under reduced motion', () => {
		expect(reducedMotionRules()).toContain('.lb-card-found');
	});

	it('US-10-T-9 turns the countdown digit (lb-digit) off under reduced motion', () => {
		expect(reducedMotionRules()).toContain('.lb-digit');
	});
});
