'use client';
import { useEffect } from 'react';
import { DEFAULT_SCHEME } from '../theme';
import { faviconSvg } from './favicon';

// Reads a scheme's dark colors from globals.css by putting a hidden element
// with that scheme on the page (any element with data-scheme and data-mode
// gets that scheme's --lb-* colors). The icon always uses the dark colors so
// the white blade stays visible.
function darkColors(scheme: string) {
	const probe = document.createElement('span');
	probe.hidden = true;
	probe.setAttribute('data-scheme', scheme);
	probe.setAttribute('data-mode', 'dark');
	document.body.appendChild(probe);
	const style = window.getComputedStyle(probe);
	const read = (name: string) => style.getPropertyValue(`--lb-${name}`).trim();
	const colors = { page: read('page'), primary: read('primary'), secondary: read('secondary'), muted: read('muted') };
	probe.remove();
	return colors;
}

// Keeps the tab icon in the colors of the chosen scheme. The static
// app/icon.svg (Emerald dark) shows until this runs.
export default function ThemeFavicon() {
	useEffect(() => {
		const root = document.documentElement;
		const update = () => {
			const href = `data:image/svg+xml,${encodeURIComponent(faviconSvg(darkColors(root.getAttribute('data-scheme') ?? DEFAULT_SCHEME)))}`;
			let links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
			if (links.length === 0) {
				const link = document.createElement('link');
				link.rel = 'icon';
				document.head.appendChild(link);
				links = [link];
			}
			for (const link of links) {
				link.type = 'image/svg+xml';
				link.href = href;
			}
		};
		update();
		const observer = new MutationObserver(update);
		observer.observe(root, { attributes: true, attributeFilter: ['data-scheme'] });
		return () => observer.disconnect();
	}, []);
	return null;
}
