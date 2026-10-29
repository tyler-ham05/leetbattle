// Color schemes and modes shared by the theme init script and the theme controls.
// The actual colors live in globals.css as CSS variables.

export const SCHEMES = [
	{ id: 'emerald', label: 'Emerald', swatch: '#34d399' },
	{ id: 'volt', label: 'Volt', swatch: '#b8f53d' },
	{ id: 'midnight', label: 'Midnight', swatch: '#28b0f3' },
	{ id: 'ultraviolet', label: 'Ultraviolet', swatch: '#a57bff' },
] as const;

export const MODES = ['dark', 'light'] as const;

export type SchemeId = (typeof SCHEMES)[number]['id'];
export type Mode = (typeof MODES)[number];

export const DEFAULT_SCHEME: SchemeId = 'emerald';
export const DEFAULT_MODE: Mode = 'dark';

export const STORAGE_KEYS = {
	scheme: 'lb-scheme',
	mode: 'lb-mode',
	introSeen: 'lb-intro-seen',
};

// Runs in <head> before first paint so a saved theme never flashes the default.
// It also skips the intro for repeat visits in the same tab and for reduced motion.
export const themeInitScript = `(function(){try{
var d=document.documentElement;
var s=localStorage.getItem('${STORAGE_KEYS.scheme}');
var m=localStorage.getItem('${STORAGE_KEYS.mode}');
if(${JSON.stringify(SCHEMES.map((s) => s.id))}.indexOf(s)>-1)d.setAttribute('data-scheme',s);
if(${JSON.stringify(MODES)}.indexOf(m)>-1)d.setAttribute('data-mode',m);
if(sessionStorage.getItem('${STORAGE_KEYS.introSeen}')||matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('lb-intro-seen');
}catch(e){}})();`;
