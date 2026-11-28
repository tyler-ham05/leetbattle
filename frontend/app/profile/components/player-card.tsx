'use client';
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import Wordmark from '../../_shared/wordmark';
import { prefersReducedMotion } from '../../_shared/motion';
import { useCountTo, useCountUp } from '../../_shared/use-count-up';
import { PROFILE_ICONS, PROFILE_ICON_KEYS, ProfileIcon } from '../../_shared/profile-icons';
import type { ProfileIconKey } from '../../_shared/profile-icons';
import type { PublicProfile } from '../../login/controller';
import Odometer from './odometer';
import CropDialog from './crop-dialog';

// What your own card can change; absent on someone else's card.
export interface CardEditor {
	icon: (_icon: ProfileIconKey) => Promise<boolean>;
	picture: (_image: string) => Promise<boolean>;
	removePicture: () => Promise<boolean>;
}

// Plain numbers count up as the page opens.
export const COUNT_AT_MS = 450;
export const COUNT_FOR_MS = 900;

// Counts up from 0 as the page opens; a later change (a new match) counts on
// from the number shown instead of starting again at 0.
export function useProfileCount(value: number) {
	const [first] = useState(value);
	const moved = useRef(false);
	if (value !== first) moved.current = true;
	const opening = useCountUp(first, COUNT_AT_MS, COUNT_FOR_MS);
	const later = useCountTo(value, COUNT_FOR_MS);
	return moved.current ? later : opening;
}

function Counted({ value }: { value: number }) {
	return <>{useProfileCount(value)}</>;
}

// The round picture where there is one, otherwise the chosen icon. Whatever
// replaces the first one shown spins in.
function AvatarFace({ picture, icon }: { picture?: string | null; icon?: string }) {
	const shown = picture || icon || 'katana';
	const first = useRef(shown);
	const changed = useRef(false);
	if (shown !== first.current) changed.current = true;
	const swap = changed.current ? 'lb-pc-swap' : '';
	return picture
		? <img key={shown} src={picture} alt="" className={swap} />
		: <ProfileIcon key={shown} icon={icon} className={swap} />;
}

// The 8 icons, "Upload a picture", and "Remove picture" when there is one.
function Picker({ profile, onIcon, onUpload, onRemove }: {
	profile: PublicProfile;
	onIcon: (_icon: ProfileIconKey) => void;
	onUpload: () => void;
	onRemove: () => void;
}) {
	return (
		<div role="group" aria-label="Choose your icon" className="lb-pc-picker lb-pc-pop">
			{PROFILE_ICON_KEYS.map((key) => (
				<button
					key={key}
					type="button"
					data-icon={key}
					aria-label={PROFILE_ICONS[key].label}
					aria-pressed={!profile.picture && (profile.icon ?? 'katana') === key}
					onClick={() => onIcon(key)}
				>
					<ProfileIcon icon={key} />
				</button>
			))}
			<button type="button" className="lb-pc-wide" onClick={onUpload}>Upload a picture</button>
			{profile.picture && <button type="button" className="lb-pc-wide lb-pc-quiet" onClick={onRemove}>Remove picture</button>}
		</div>
	);
}

// Tilts the card toward the pointer and moves the foil, glitter, glare and
// edge light with it; the light behind the card (on the page) follows a little.
function useTilt() {
	const card = useRef<HTMLElement>(null);
	const [still] = useState(prefersReducedMotion);

	function move(event: PointerEvent<HTMLDivElement>) {
		const el = card.current;
		if (still || !el) return;
		const r = el.getBoundingClientRect();
		const x = r.width ? (event.clientX - r.left) / r.width : 0.5;
		const y = r.height ? (event.clientY - r.top) / r.height : 0.5;
		el.classList.add('lb-pc-tracking');
		const set = (name: string, value: string) => el.style.setProperty(name, value);
		set('--lb-pc-ry', `${((x - 0.5) * 18).toFixed(2)}deg`);
		set('--lb-pc-rx', `${((0.5 - y) * 14).toFixed(2)}deg`);
		set('--lb-pc-gx', `${(x * 100).toFixed(1)}%`);
		set('--lb-pc-gy', `${(y * 100).toFixed(1)}%`);
		set('--lb-pc-hx', `${(30 + x * 40).toFixed(1)}%`);
		set('--lb-pc-hy', `${(30 + y * 40).toFixed(1)}%`);
		set('--lb-pc-tilt', `${((x - 0.5) * 60).toFixed(1)}deg`);
		const page = el.closest<HTMLElement>('.lb-pc-wrap');
		page?.style.setProperty('--lb-pc-lx', `${((x - 0.5) * -60).toFixed(1)}px`);
		page?.style.setProperty('--lb-pc-ly', `${((y - 0.5) * -40).toFixed(1)}px`);
	}

	function leave() {
		const el = card.current;
		if (!el) return;
		el.classList.remove('lb-pc-tracking');
		el.style.setProperty('--lb-pc-rx', '0deg');
		el.style.setProperty('--lb-pc-ry', '0deg');
		const page = el.closest<HTMLElement>('.lb-pc-wrap');
		page?.style.setProperty('--lb-pc-lx', '0px');
		page?.style.setProperty('--lb-pc-ly', '0px');
	}

	return { card, move, leave };
}

// US-7-T-5: the trading-card-style player card. It swings up as the page
// opens, tilts toward the pointer, and shines more the higher the league
// (--lb-pc-shine on the page). On your own card the avatar opens the picker.
export default function PlayerCard({ profile, edit }: { profile: PublicProfile; edit?: CardEditor }) {
	const { card, move, leave } = useTilt();
	const [picking, setPicking] = useState(false);
	const [file, setFile] = useState<File | null>(null);
	const avatar = useRef<HTMLButtonElement>(null);
	const fileInput = useRef<HTMLInputElement>(null);
	const picker = useRef<HTMLDivElement>(null);

	// A click anywhere else, or Esc, closes the picker.
	useEffect(() => {
		if (!picking) return;
		const click = (event: MouseEvent) => {
			if (!picker.current?.contains(event.target as Node)) setPicking(false);
		};
		const key = (event: KeyboardEvent) => event.key === 'Escape' && setPicking(false);
		document.addEventListener('click', click);
		document.addEventListener('keydown', key);
		return () => {
			document.removeEventListener('click', click);
			document.removeEventListener('keydown', key);
		};
	}, [picking]);

	function closeCrop() {
		setFile(null);
		avatar.current?.focus();
	}

	const face = <AvatarFace picture={profile.picture} icon={profile.icon} />;
	// The crop dialog sits outside the zone: the zone's perspective would
	// otherwise pin the fixed dialog to the card instead of the window.
	return (
		<>
			<div className="lb-pc-zone" onPointerMove={move} onPointerLeave={leave}>
				{/* The card's soft shadow on the page, falling opposite the tilt. */}
				<div className="lb-pc-cast" aria-hidden="true" />
				<article ref={card} aria-label="Player card" className="lb-pc-card">
					<div className="lb-pc-metal-layer" aria-hidden="true" />
					<div className="lb-pc-holo" aria-hidden="true" />
					<div className="lb-pc-glitter" aria-hidden="true" />
					<div className="lb-pc-glare" aria-hidden="true" />
					<div className="lb-pc-edge" aria-hidden="true" />
					<div className="lb-pc-card-top">
						<span className="lb-pc-brand"><Wordmark /></span>
						<span className="lb-pc-cap">Ranked</span>
					</div>
					<div className="lb-pc-avatar-spot">
						{edit ? (
							<button
								ref={avatar}
								type="button"
								aria-label="Change your icon"
								aria-expanded={picking}
								className="lb-pc-avatar lb-pc-avatar-button"
								onClick={(event) => {
									event.stopPropagation();
									setPicking((open) => !open);
								}}
							>
								{face}
							</button>
						) : (
							<div className="lb-pc-avatar">{face}</div>
						)}
						{edit && picking && (
							<div ref={picker}>
								<Picker
									profile={profile}
									onIcon={(key) => {
										setPicking(false);
										void edit.icon(key);
									}}
									onUpload={() => {
										setPicking(false);
										if (fileInput.current) {
											fileInput.current.value = '';
											fileInput.current.click();
										}
									}}
									onRemove={() => {
										setPicking(false);
										void edit.removePicture();
									}}
								/>
							</div>
						)}
					</div>
					{edit && (
						<input
							ref={fileInput}
							type="file"
							hidden
							aria-label="Picture file"
							accept="image/png,image/jpeg,image/webp"
							onChange={(event) => setFile(event.target.files?.[0] ?? null)}
						/>
					)}
					<p className="lb-pc-card-name">{profile.name}</p>
					<div className="lb-pc-card-league">{profile.league ?? 'Bronze I'}</div>
					<div className="lb-pc-card-rating">
						<span className="lb-pc-cap">Rating</span>
						<Odometer value={profile.rating ?? 0} />
					</div>
					<div className="lb-pc-card-record">
						<div><span className="lb-pc-cap">Wins</span><b><Counted value={profile.wins ?? 0} /></b></div>
						<div><span className="lb-pc-cap">Losses</span><b><Counted value={profile.losses ?? 0} /></b></div>
						<div><span className="lb-pc-cap">Draws</span><b><Counted value={profile.draws ?? 0} /></b></div>
					</div>
				</article>
			</div>
			{edit && file && (
				<CropDialog
					key={`${file.name}-${file.lastModified}-${file.size}`}
					file={file}
					onCancel={closeCrop}
					onUse={async (image) => {
						const saved = await edit.picture(image);
						if (saved) closeCrop();
						return saved;
					}}
				/>
			)}
		</>
	);
}
