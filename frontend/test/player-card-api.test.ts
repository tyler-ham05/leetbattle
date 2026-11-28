// US-7-T-5: the AuthService client's profile calls.
// Pseudocode: test/player-card-test-pseudo.md, "AuthService client".
// `fetch` is stubbed, so nothing here reaches AuthService; each test checks
// the request the client would have sent, or what it makes of the answer.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthAPIService } from '../app/login/controller';
import { jsonResponse, requestsOf, stubFetch } from './helpers';

// Another player's public profile, as GET /users/:id answers it (no email).
const publicProfile = {
	id: 'u2', name: 'Grace', icon: 'bolt', description: 'Hi', picture: null,
	rating: 684, league: 'Gold I', leagueMin: 600, nextLeague: { name: 'Gold II', at: 700 },
	wins: 24, losses: 17, draws: 3, createdAt: '2026-01-01T00:00:00Z',
};

// Every call answers with `{ user }` unless a test stubs something else.
let fetchMock: ReturnType<typeof stubFetch>;
beforeEach(() => {
	localStorage.setItem('authToken', 'token-1');
	fetchMock = stubFetch(() => jsonResponse({ user: publicProfile }));
});
afterEach(() => {
	vi.unstubAllGlobals();
	localStorage.clear();
});

// The one request the client made.
const sent = () => requestsOf(fetchMock)[0];

describe('US-7-T-5 AuthService client: profiles', () => {
	// GET /users/:id needs a signed-in caller, so the token goes with it.
	it('US-7-T-5 getUser sends GET /users/:id with the bearer token', async () => {
		await new AuthAPIService().getUser('u2');
		expect([sent().method, sent().url.endsWith('/users/u2'), sent().headers.Authorization]).toEqual(['GET', true, 'Bearer token-1']);
	});

	it('US-7-T-5 getUser returns the public profile from { user }', async () => {
		expect(await new AuthAPIService().getUser('u2')).toEqual(publicProfile);
	});

	// An unknown or malformed id is a 404: the page shows "Player not found".
	it('US-7-T-5 getUser returns null when AuthService answers 404', async () => {
		stubFetch(() => jsonResponse({ error: 'not found' }, 404));
		expect(await new AuthAPIService().getUser('nope')).toBeNull();
	});

	// Choosing a preset icon saves only the icon.
	it('US-7-T-5 updateProfile sends PATCH /account with the icon', async () => {
		await new AuthAPIService().updateProfile({ icon: 'bolt' });
		expect([sent().method, sent().url.endsWith('/account'), sent().body]).toEqual(['PATCH', true, { icon: 'bolt' }]);
	});

	it('US-7-T-5 updateProfile sends PATCH /account with the description', async () => {
		await new AuthAPIService().updateProfile({ description: 'Night owl' });
		expect(sent().body).toEqual({ description: 'Night owl' });
	});

	// The cropped picture goes up as a data: URL under `image`.
	it('US-7-T-5 setPicture sends PUT /account/picture with { image }', async () => {
		await new AuthAPIService().setPicture('data:image/webp;base64,AAAA');
		expect([sent().method, sent().url.endsWith('/account/picture'), sent().body]).toEqual(['PUT', true, { image: 'data:image/webp;base64,AAAA' }]);
	});

	it('US-7-T-5 removePicture sends DELETE /account/picture', async () => {
		await new AuthAPIService().removePicture();
		expect([sent().method, sent().url.endsWith('/account/picture')]).toEqual(['DELETE', true]);
	});
});
