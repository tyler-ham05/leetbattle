// US-7-T-5: motion rules and metal colours for the player card.
// Pseudocode: test/player-card-test-pseudo.md, "Motion rules (globals.css)".
// Every new animation needs a prefers-reduced-motion override, entrances fill
// backwards so a hover transform still works after they end, and the five
// metal colours exist for both modes. Reads globals.css only.
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

describe('US-7-T-5 motion rules (AC11)', () => {
	it('US-7-T-5 turns the card swinging in (lb-pc-card) off under reduced motion', () => {
		expect(reducedMotionRules()).toContain('.lb-pc-card');
	});

	it('US-7-T-5 turns the name\'s letters dropping in (lb-pc-letter) off under reduced motion', () => {
		expect(reducedMotionRules()).toContain('.lb-pc-letter');
	});

	it('US-7-T-5 stops the odometer rolling (lb-pc-odo) under reduced motion', () => {
		expect(reducedMotionRules()).toContain('.lb-pc-odo');
	});

	it('US-7-T-5 stops the league bar growing and shining (lb-pc-fill) under reduced motion', () => {
		expect(reducedMotionRules()).toContain('.lb-pc-fill');
	});

	it('US-7-T-5 turns the icon spinning in (lb-pc-swap) off under reduced motion', () => {
		expect(reducedMotionRules()).toContain('.lb-pc-swap');
	});

	it('US-7-T-5 turns the picker and editor popping in (lb-pc-pop) off under reduced motion', () => {
		expect(reducedMotionRules()).toContain('.lb-pc-pop');
	});

	it('US-7-T-5 holds the foil (lb-pc-holo) still under reduced motion', () => {
		expect(reducedMotionRules()).toContain('.lb-pc-holo');
	});

	// `both`/`forwards` would hold the keyframes' transform and block the tilt.
	it('US-7-T-5 fills the card\'s entrance backwards', () => {
		expect(rule('.lb-pc-card')).toMatch(/animation:[^;]*backwards/);
	});

	it('US-7-T-5 defines the metal colours for light mode too', () => {
		expect(css).toMatch(/\[data-mode="light"\][^{]*\{[^}]*--lb-metal-gold/);
	});
});
