// The tab icon: </> with a katana as the slash. < is Team 1's color, > is
// Team 2's, on a square tile in the page color. The katana points down; its
// blade and guard are always white and its handle is the muted color. A thin
// outline in the tile color where the blade crosses the brackets makes it read
// as cutting through them.

export interface FaviconColors {
	page: string;
	primary: string;
	secondary: string;
	muted: string;
}

const BLADE = 'M22.48,5.44 L20.80,9.08 L19.13,12.71 L17.45,16.34 L15.77,19.97 L14.10,23.61 L12.42,27.24 L11.08,30.14 L10.06,26.15 L11.74,22.52 L13.41,18.88 L15.09,15.25 L16.77,11.62 L18.44,7.99 L20.12,4.36 Z';
const GUARD = 'M23.84,6.07 L18.76,3.73';
const HANDLE = 'M22.90,1.40 L21.55,4.36';

export function faviconSvg({ page, primary, secondary, muted }: FaviconColors) {
	return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
		+ `<rect width="32" height="32" fill="${page}"/>`
		+ `<path d="M12.4 8.2L5.6 16l6.8 7.8" fill="none" stroke="${primary}" stroke-width="3.6" stroke-linejoin="miter" stroke-miterlimit="8"/>`
		+ `<path d="M19.6 8.2L26.4 16l-6.8 7.8" fill="none" stroke="${secondary}" stroke-width="3.6" stroke-linejoin="miter" stroke-miterlimit="8"/>`
		+ `<path d="${BLADE}" fill="#ffffff" stroke="${page}" stroke-width="1.4" paint-order="stroke"/>`
		+ `<path d="${GUARD}" stroke="${page}" stroke-width="3.2"/>`
		+ `<path d="${GUARD}" stroke="#ffffff" stroke-width="1.8"/>`
		+ `<path d="${HANDLE}" stroke="${muted}" stroke-width="2.4"/>`
		+ '</svg>';
}
