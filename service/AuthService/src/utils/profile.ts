// US-7-T-5: what a player can put on their profile: one of the preset icons,
// a short description and a small round picture.

// The preset icons. The frontend draws them from the same keys.
export const ICONS = ['katana', 'brackets', 'terminal', 'bolt', 'flame', 'crown', 'cube', 'moon'];

export const DESCRIPTION_MAX = 80;
export const PICTURE_MAX_BYTES = 200 * 1024;

export const isIcon = (value: unknown): value is string => typeof value === 'string' && ICONS.includes(value);

// The description as it is saved (trimmed), or null when it isn't allowed.
export function cleanDescription(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length <= DESCRIPTION_MAX ? trimmed : null;
}

// The image type told by the file's first bytes, whatever the upload claims.
function detectType(bytes: Buffer): string | null {
	if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
	if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';
	if (bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
	return null;
}

export interface Picture {
	bytes: Buffer;
	type: string;
}

// Reads a `data:image/<type>;base64,<data>` upload. Only PNG, JPEG and WebP
// of at most 200 KB are accepted; anything else gives null.
export function parsePicture(value: unknown): Picture | null {
	if (typeof value !== 'string') return null;
	const match = /^data:image\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/]+={0,2})$/i.exec(value);
	if (!match) return null;
	const bytes = Buffer.from(match[1], 'base64');
	const type = detectType(bytes);
	if (!type || bytes.length > PICTURE_MAX_BYTES) return null;
	return { bytes, type };
}

// The stored picture as a data URL for the page, or null when there is none.
export function pictureUrl(bytes: Buffer | null, type: string | null): string | null {
	return bytes && type ? `data:${type};base64,${bytes.toString('base64')}` : null;
}
