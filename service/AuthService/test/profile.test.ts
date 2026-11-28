// US-7-T-5 Player profiles: icon, description, picture, league bounds and GET /users/:id
//
// A new player (AC1)
//  - A player who just signed up should have the `katana` icon in GET /me
//  - A player who just signed up should have an empty description in GET /me
//  - A player who just signed up should have no picture (null) in GET /me
// League bounds in GET /me (AC6)
//  - A player rated 642 should have leagueMin 600
//  - A player rated 642 should have nextLeague { name: "Gold II", at: 700 }
//  - A player rated 2000 should have nextLeague null
// Changing your own profile: PATCH /account (AC2, AC3, AC5)
//  - Setting icon to `bolt` should return the user with icon `bolt`
//  - After setting icon to `bolt`, GET /me should show `bolt`
//  - An icon that isn't one of the 8 keys should return 400
//  - After a rejected icon, GET /me should still show the old icon
//  - A description of 80 characters should be saved
//  - A description of 81 characters should return 400
//  - After a rejected description, GET /me should still show the old description
//  - A description with spaces around it should be saved trimmed
//  - An empty description should clear it
//  - A description containing `<script>alert(1)</script>` should be saved exactly as sent (it's shown as text, not run)
//  - A body with none of name, icon and description should return 400
//  - Without a login token it should return 401
//  - Sending another player's id in the body should still only change the signed-in player
// Profile picture: PUT /account/picture and DELETE /account/picture (AC4, AC5)
//  - A small PNG sent as a data URL should return 200
//  - After uploading a PNG, GET /me should return the picture as a data:image/png;base64 URL with the same bytes
//  - A small JPEG should be accepted
//  - A small WebP should be accepted
//  - A data URL that says image/png but holds a GIF's bytes should return 400
//  - Text pretending to be an image (data:image/png;base64 of "<svg>...") should return 400
//  - A picture over 200 KB once decoded should return 400
//  - After a rejected picture, GET /me should still show the old picture
//  - A body without an image should return 400
//  - Without a login token it should return 401
//  - DELETE /account/picture should return 200
//  - After DELETE /account/picture, GET /me should show picture null
//  - After DELETE /account/picture, the player's icon should be unchanged
// Another player's profile: GET /users/:id (AC6)
//  - It should return their picture (null when they have none)
//  - Signed in, GET /users/<their id> should return 200
//  - It should return their name
//  - It should return their icon
//  - It should return their description
//  - It should return their rating and league
//  - It should not include an email field
//  - It should not include an emailVerified field
//  - Without a login token it should return 401
//  - An id that isn't a UUID should return 404
//  - A UUID with no user should return 404
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { request } from './setup';
import { pool } from '../src/db';

interface Player { id: string; token: string }

// Signs up a fresh player and returns their id and login token.
async function signUp(): Promise<Player> {
	const res = await request.post('/signup').send({
		email: `profile-${randomUUID()}@example.com`,
		password: 'correct-horse-battery-staple',
		name: 'Profile Player',
	});
	return { id: res.body.user.id, token: res.body.token };
}

// GET /me as `player`: their own profile.
async function profileOf(player: Player) {
	const res = await request.get('/me').set('Authorization', `Bearer ${player.token}`);
	return res.body.user;
}

// Sets a player's rating directly, to check the league bounds for a known rating.
async function setRating(player: Player, rating: number) {
	await pool.query('UPDATE users SET rating = $1 WHERE id = $2', [rating, player.id]);
}

// PATCH /account as `player`.
function patchAccount(player: Player, body: unknown) {
	return request.patch('/account').set('Authorization', `Bearer ${player.token}`).send(body as object);
}

// PUT /account/picture as `player`.
function putPicture(player: Player, body: unknown) {
	return request.put('/account/picture').set('Authorization', `Bearer ${player.token}`).send(body as object);
}

// GET /users/:id as `viewer`.
function viewProfile(viewer: Player, id: string) {
	return request.get(`/users/${id}`).set('Authorization', `Bearer ${viewer.token}`);
}

// Wraps raw bytes in a data URL that claims to be `type`.
const dataUrl = (bytes: Buffer, type = 'image/png') => `data:${type};base64,${bytes.toString('base64')}`;

// A real 1x1 PNG.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
// The start of a JPEG (SOI marker, then a JFIF APP0 segment): the magic bytes are what's checked.
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9]);
// A WebP header: 'RIFF', a 4-byte size, 'WEBP', then a 'VP8 ' chunk.
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x1a, 0x00, 0x00, 0x00]), Buffer.from('WEBPVP8 '), Buffer.alloc(18)]);
// A GIF header, which isn't one of the allowed types.
const GIF = Buffer.concat([Buffer.from('GIF89a'), Buffer.from([0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x3b])]);
// SVG markup pretending to be a PNG.
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
// A PNG signature followed by zeros: just over 200 KB decoded, but its base64
// still fits under the route's body limit, so the 200 KB rule is what rejects it.
const BIG_PNG = Buffer.concat([PNG.subarray(0, 8), Buffer.alloc(200 * 1024 + 1)]);

describe('US-7-T-5 a new player', () => {
	it('US-7-T-5 gives a new player the katana icon', async () => {
		expect((await profileOf(await signUp())).icon).toBe('katana');
	});

	it('US-7-T-5 gives a new player an empty description', async () => {
		expect((await profileOf(await signUp())).description).toBe('');
	});

	it('US-7-T-5 gives a new player no picture', async () => {
		expect((await profileOf(await signUp())).picture).toBeNull();
	});
});

describe('US-7-T-5 league bounds in GET /me', () => {
	// 642 is in Gold I, which starts at 600.
	it('US-7-T-5 returns leagueMin 600 for a rating of 642', async () => {
		const player = await signUp();
		await setRating(player, 642);
		expect((await profileOf(player)).leagueMin).toBe(600);
	});

	it('US-7-T-5 returns nextLeague Gold II at 700 for a rating of 642', async () => {
		const player = await signUp();
		await setRating(player, 642);
		expect((await profileOf(player)).nextLeague).toEqual({ name: 'Gold II', at: 700 });
	});

	// Platinum is the top league, so there is nothing next.
	it('US-7-T-5 returns nextLeague null for a rating of 2000', async () => {
		const player = await signUp();
		await setRating(player, 2000);
		expect((await profileOf(player)).nextLeague).toBeNull();
	});
});

describe('US-7-T-5 PATCH /account changes your own profile', () => {
	it('US-7-T-5 returns the user with the new icon', async () => {
		const res = await patchAccount(await signUp(), { icon: 'bolt' });
		expect(res.body.user.icon).toBe('bolt');
	});

	it('US-7-T-5 saves the new icon', async () => {
		const player = await signUp();
		await patchAccount(player, { icon: 'bolt' });
		expect((await profileOf(player)).icon).toBe('bolt');
	});

	it('US-7-T-5 returns 400 for an icon that isn\'t one of the 8 keys', async () => {
		const res = await patchAccount(await signUp(), { icon: 'skull' });
		expect(res.status).toBe(400);
	});

	it('US-7-T-5 keeps the old icon after a rejected one', async () => {
		const player = await signUp();
		await patchAccount(player, { icon: 'crown' });
		await patchAccount(player, { icon: 'skull' });
		expect((await profileOf(player)).icon).toBe('crown');
	});

	it('US-7-T-5 saves a description of 80 characters', async () => {
		const res = await patchAccount(await signUp(), { description: 'a'.repeat(80) });
		expect(res.body.user.description).toBe('a'.repeat(80));
	});

	it('US-7-T-5 returns 400 for a description of 81 characters', async () => {
		const res = await patchAccount(await signUp(), { description: 'a'.repeat(81) });
		expect(res.status).toBe(400);
	});

	it('US-7-T-5 keeps the old description after a rejected one', async () => {
		const player = await signUp();
		await patchAccount(player, { description: 'Speed runner' });
		await patchAccount(player, { description: 'a'.repeat(81) });
		expect((await profileOf(player)).description).toBe('Speed runner');
	});

	it('US-7-T-5 trims the description', async () => {
		const res = await patchAccount(await signUp(), { description: '   Speed runner  ' });
		expect(res.body.user.description).toBe('Speed runner');
	});

	it('US-7-T-5 clears the description when it is empty', async () => {
		const player = await signUp();
		await patchAccount(player, { description: 'Speed runner' });
		await patchAccount(player, { description: '' });
		expect((await profileOf(player)).description).toBe('');
	});

	// The description is stored as sent; the page shows it as text, so it never runs.
	it('US-7-T-5 saves a description containing a script tag exactly as sent', async () => {
		const res = await patchAccount(await signUp(), { description: '<script>alert(1)</script>' });
		expect(res.body.user.description).toBe('<script>alert(1)</script>');
	});

	it('US-7-T-5 returns 400 for a body with none of name, icon and description', async () => {
		const res = await patchAccount(await signUp(), {});
		expect(res.status).toBe(400);
	});

	it('US-7-T-5 returns 401 without a login token', async () => {
		const res = await request.patch('/account').send({ icon: 'bolt' });
		expect(res.status).toBe(401);
	});

	// The account comes from the token; an id in the body is ignored.
	it('US-7-T-5 only changes the signed-in player when another id is sent', async () => {
		const [player, other] = await Promise.all([signUp(), signUp()]);
		await patchAccount(player, { id: other.id, icon: 'moon' });
		expect((await profileOf(other)).icon).toBe('katana');
	});
});

describe('US-7-T-5 PUT and DELETE /account/picture', () => {
	it('US-7-T-5 accepts a small PNG', async () => {
		const res = await putPicture(await signUp(), { image: dataUrl(PNG) });
		expect(res.status).toBe(200);
	});

	it('US-7-T-5 returns the uploaded PNG as a data URL with the same bytes', async () => {
		const player = await signUp();
		await putPicture(player, { image: dataUrl(PNG) });
		expect((await profileOf(player)).picture).toBe(dataUrl(PNG, 'image/png'));
	});

	// The data URL claims PNG, but the bytes say JPEG, and the bytes win.
	it('US-7-T-5 accepts a small JPEG', async () => {
		const res = await putPicture(await signUp(), { image: dataUrl(JPEG) });
		expect(res.status).toBe(200);
	});

	it('US-7-T-5 accepts a small WebP', async () => {
		const res = await putPicture(await signUp(), { image: dataUrl(WEBP, 'image/webp') });
		expect(res.status).toBe(200);
	});

	it('US-7-T-5 returns 400 for a GIF labelled as a PNG', async () => {
		const res = await putPicture(await signUp(), { image: dataUrl(GIF) });
		expect(res.status).toBe(400);
	});

	it('US-7-T-5 returns 400 for SVG text labelled as a PNG', async () => {
		const res = await putPicture(await signUp(), { image: dataUrl(SVG) });
		expect(res.status).toBe(400);
	});

	it('US-7-T-5 returns 400 for a picture over 200 KB once decoded', async () => {
		const res = await putPicture(await signUp(), { image: dataUrl(BIG_PNG) });
		expect(res.status).toBe(400);
	});

	it('US-7-T-5 keeps the old picture after a rejected one', async () => {
		const player = await signUp();
		await putPicture(player, { image: dataUrl(PNG) });
		await putPicture(player, { image: dataUrl(GIF) });
		expect((await profileOf(player)).picture).toBe(dataUrl(PNG));
	});

	it('US-7-T-5 returns 400 for a body without an image', async () => {
		const res = await putPicture(await signUp(), {});
		expect(res.status).toBe(400);
	});

	it('US-7-T-5 returns 401 without a login token', async () => {
		const res = await request.put('/account/picture').send({ image: dataUrl(PNG) });
		expect(res.status).toBe(401);
	});

	it('US-7-T-5 returns 200 when removing the picture', async () => {
		const player = await signUp();
		await putPicture(player, { image: dataUrl(PNG) });
		const res = await request.delete('/account/picture').set('Authorization', `Bearer ${player.token}`);
		expect(res.status).toBe(200);
	});

	it('US-7-T-5 shows no picture after removing it', async () => {
		const player = await signUp();
		await putPicture(player, { image: dataUrl(PNG) });
		await request.delete('/account/picture').set('Authorization', `Bearer ${player.token}`);
		expect((await profileOf(player)).picture).toBeNull();
	});

	// With the picture gone, the card falls back to the chosen icon.
	it('US-7-T-5 keeps the icon after removing the picture', async () => {
		const player = await signUp();
		await patchAccount(player, { icon: 'flame' });
		await putPicture(player, { image: dataUrl(PNG) });
		await request.delete('/account/picture').set('Authorization', `Bearer ${player.token}`);
		expect((await profileOf(player)).icon).toBe('flame');
	});
});

describe('US-7-T-5 GET /users/:id shows another player\'s public profile', () => {
	it('US-7-T-5 returns picture null for a player with none', async () => {
		const [viewer, other] = await Promise.all([signUp(), signUp()]);
		const res = await viewProfile(viewer, other.id);
		expect(res.body.user.picture).toBeNull();
	});

	it('US-7-T-5 returns 200 for another player', async () => {
		const [viewer, other] = await Promise.all([signUp(), signUp()]);
		const res = await viewProfile(viewer, other.id);
		expect(res.status).toBe(200);
	});

	it('US-7-T-5 returns their name', async () => {
		const [viewer, other] = await Promise.all([signUp(), signUp()]);
		const res = await viewProfile(viewer, other.id);
		expect(res.body.user.name).toBe('Profile Player');
	});

	it('US-7-T-5 returns their icon', async () => {
		const [viewer, other] = await Promise.all([signUp(), signUp()]);
		await patchAccount(other, { icon: 'cube' });
		const res = await viewProfile(viewer, other.id);
		expect(res.body.user.icon).toBe('cube');
	});

	it('US-7-T-5 returns their description', async () => {
		const [viewer, other] = await Promise.all([signUp(), signUp()]);
		await patchAccount(other, { description: 'Graph theory fan' });
		const res = await viewProfile(viewer, other.id);
		expect(res.body.user.description).toBe('Graph theory fan');
	});

	it('US-7-T-5 returns their rating and league', async () => {
		const [viewer, other] = await Promise.all([signUp(), signUp()]);
		await setRating(other, 642);
		const res = await viewProfile(viewer, other.id);
		expect({ rating: res.body.user.rating, league: res.body.user.league }).toEqual({ rating: 642, league: 'Gold I' });
	});

	// Another player's email is never shown.
	it('US-7-T-5 does not include an email field', async () => {
		const [viewer, other] = await Promise.all([signUp(), signUp()]);
		const res = await viewProfile(viewer, other.id);
		expect(res.body.user).not.toHaveProperty('email');
	});

	it('US-7-T-5 does not include an emailVerified field', async () => {
		const [viewer, other] = await Promise.all([signUp(), signUp()]);
		const res = await viewProfile(viewer, other.id);
		expect(res.body.user).not.toHaveProperty('emailVerified');
	});

	it('US-7-T-5 returns 401 without a login token', async () => {
		const other = await signUp();
		const res = await request.get(`/users/${other.id}`);
		expect(res.status).toBe(401);
	});

	it('US-7-T-5 returns 404 for an id that isn\'t a UUID', async () => {
		const res = await viewProfile(await signUp(), 'not-a-uuid');
		expect(res.status).toBe(404);
	});

	it('US-7-T-5 returns 404 for a UUID with no user', async () => {
		const res = await viewProfile(await signUp(), randomUUID());
		expect(res.status).toBe(404);
	});
});
