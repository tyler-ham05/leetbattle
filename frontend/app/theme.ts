// Color schemes and modes shared by the theme init script and the theme controls.
// The actual colors live in globals.css as CSS variables.

export const SCHEMES = [
	{ id: 'emerald', label: 'Emerald' },
	{ id: 'midnight', label: 'Midnight' },
	{ id: 'nocturne', label: 'Nocturne' },
	{ id: 'shoreline', label: 'Shoreline' },
	{ id: 'merlot', label: 'Merlot' },
	{ id: 'coffee', label: 'Coffee' },
	{ id: 'performative', label: 'Performative' },
	{ id: 'lilac', label: 'Lilac' },
	{ id: 'tidepool', label: 'Tidepool' },
	{ id: 'sugarplum', label: 'Sugarplum' },
	{ id: 'vim', label: 'Vim' },
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
