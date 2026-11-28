'use client';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, SyntheticEvent } from 'react';

// The circle the kept part shows through, and the size of the export.
const FRAME = 248;
const OUT = 256;
const MAX_ZOOM = 4;
const MAX_BYTES = 8 * 1024 * 1024;

// Why a chosen file can't be cropped, or null if it can.
function problemWith(file: File): string | null {
	if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return 'Choose a PNG, JPEG or WebP picture.';
	if (file.size > MAX_BYTES) return 'That picture is over 8 MB. Choose a smaller one.';
	return null;
}

// The picture's natural size, the scale that just fills the circle, the zoom
// on top of that, and its centre's offset from the circle's centre (screen px).
interface Crop { w: number; h: number; base: number; z: number; x: number; y: number }

// Keeps the picture covering the whole circle: it can't move past its edges.
function clamp(crop: Crop): Crop {
	const k = crop.base * crop.z;
	const maxX = Math.max(0, (crop.w * k - FRAME) / 2);
	const maxY = Math.max(0, (crop.h * k - FRAME) / 2);
	return { ...crop, x: Math.min(maxX, Math.max(-maxX, crop.x)), y: Math.min(maxY, Math.max(-maxY, crop.y)) };
}

// The part of the picture inside the circle, drawn onto a 256x256 canvas, as a
// WebP data: URL (or PNG where the browser can't make WebP).
function exportCrop(img: HTMLImageElement, crop: Crop): string {
	const k = crop.base * crop.z;
	const side = FRAME / k;
	const sx = crop.w / 2 - crop.x / k - side / 2;
	const sy = crop.h / 2 - crop.y / k - side / 2;
	const canvas = document.createElement('canvas');
	canvas.width = OUT;
	canvas.height = OUT;
	const ctx = canvas.getContext('2d');
	if (ctx) {
		ctx.imageSmoothingQuality = 'high';
		ctx.drawImage(img, sx, sy, side, side, 0, 0, OUT, OUT);
	}
	const webp = canvas.toDataURL('image/webp', 0.9);
	// A browser that can't make WebP falls back to JPEG: a full-size PNG of a photo
	// can go over AuthService's 200 KB limit.
	return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.9);
}

// US-7-T-5: crop a chosen picture into a circle in the browser. Drag (or the
// arrow keys, further with Shift) moves it; the slider, the wheel, "+" and "-"
// zoom; Esc cancels. "Use picture" hands back the 256x256 export.
export default function CropDialog({ file, onCancel, onUse }: {
	file: File;
	onCancel: () => void;
	onUse: (_image: string) => Promise<boolean>;
}) {
	const [problem, setProblem] = useState(() => problemWith(file));
	const [src] = useState(() => (problemWith(file) ? null : URL.createObjectURL(file)));
	const [crop, setCrop] = useState<Crop>({ w: 0, h: 0, base: 1, z: 1, x: 0, y: 0 });
	const [saving, setSaving] = useState(false);
	const stage = useRef<HTMLDivElement>(null);
	const img = useRef<HTMLImageElement>(null);
	const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

	const zoomTo = (z: number) => setCrop((c) => clamp({ ...c, z: Math.min(MAX_ZOOM, Math.max(1, z)) }));
	const moveBy = (dx: number, dy: number) => setCrop((c) => clamp({ ...c, x: c.x + dx, y: c.y + dy }));

	useEffect(() => () => {
		if (src) URL.revokeObjectURL(src);
	}, [src]);

	// The wheel zooms; it needs a non-passive listener to keep the page still.
	useEffect(() => {
		const el = stage.current;
		if (!el) return;
		el.focus();
		const onWheel = (event: WheelEvent) => {
			event.preventDefault();
			setCrop((c) => clamp({ ...c, z: Math.min(MAX_ZOOM, Math.max(1, c.z * (event.deltaY < 0 ? 1.08 : 1 / 1.08))) }));
		};
		el.addEventListener('wheel', onWheel, { passive: false });
		return () => el.removeEventListener('wheel', onWheel);
	}, []);

	function loaded(event: SyntheticEvent<HTMLImageElement>) {
		const { naturalWidth: w, naturalHeight: h } = event.currentTarget;
		if (!w || !h) {
			setProblem('That file couldn\'t be read as a picture.');
			return;
		}
		setCrop({ w, h, base: Math.max(FRAME / w, FRAME / h), z: 1, x: 0, y: 0 });
	}

	function keyDown(event: KeyboardEvent<HTMLDivElement>) {
		const step = event.shiftKey ? 20 : 6;
		const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
		if (moves[event.key]) {
			event.preventDefault();
			moveBy(...moves[event.key]);
		}
		if (event.key === '+' || event.key === '=') zoomTo(crop.z * 1.1);
		if (event.key === '-' || event.key === '−') zoomTo(crop.z / 1.1);
	}

	function pointerDown(event: PointerEvent<HTMLDivElement>) {
		drag.current = { px: event.clientX, py: event.clientY, x: crop.x, y: crop.y };
		event.currentTarget.setPointerCapture?.(event.pointerId);
	}

	function pointerMove(event: PointerEvent<HTMLDivElement>) {
		const from = drag.current;
		if (from) setCrop((c) => clamp({ ...c, x: from.x + event.clientX - from.px, y: from.y + event.clientY - from.py }));
	}

	async function use() {
		if (!img.current || !crop.w || problem) {
			onCancel();
			return;
		}
		setSaving(true);
		const saved = await onUse(exportCrop(img.current, crop));
		setSaving(false);
		if (!saved) setProblem('That picture couldn\'t be saved. Try another one.');
	}

	const k = crop.base * crop.z;
	return (
		<div
			className="lb-pc-crop-back fixed inset-0 z-40 grid place-items-center p-6"
			onKeyDown={(event) => {
				if (event.key === 'Escape') {
					event.stopPropagation();
					onCancel();
				}
			}}
		>
			<div role="dialog" aria-modal="true" aria-labelledby="lb-pc-crop-title" className="lb-pc-crop lb-pc-pop flex w-[min(440px,100%)] flex-col gap-[22px] rounded-xl border border-line bg-surface p-7">
				<h2 id="lb-pc-crop-title" className="text-[22px] font-black tracking-[-0.04em]">Crop your picture</h2>
				<p className="-mt-3.5 text-[13px] text-muted">Drag to move it. Zoom to fit what you want inside the circle.</p>
				{problem ? (
					<p role="alert" className="text-[13px] text-danger">{problem}</p>
				) : (
					<>
						<div
							ref={stage}
							tabIndex={0}
							aria-label="Picture position: drag, or use the arrow keys"
							className="lb-pc-stage"
							onKeyDown={keyDown}
							onPointerDown={pointerDown}
							onPointerMove={pointerMove}
							onPointerUp={() => {
								drag.current = null;
							}}
						>
							{src && (
								<img
									ref={img}
									src={src}
									alt=""
									onLoad={loaded}
									style={{
										width: crop.w * k,
										height: crop.h * k,
										transform: `translate(${crop.x - (crop.w * k) / 2}px, ${crop.y - (crop.h * k) / 2}px)`,
									}}
								/>
							)}
							<span className="lb-pc-frame" />
						</div>
						<label className="flex items-center gap-3.5">
							<span className="text-xs text-muted">Zoom</span>
							<input
								type="range"
								min={1}
								max={MAX_ZOOM}
								step={0.01}
								value={crop.z}
								onChange={(event) => zoomTo(Number(event.target.value))}
								className="lb-pc-zoom flex-1"
							/>
						</label>
					</>
				)}
				<div className="flex justify-end gap-2.5">
					<button type="button" onClick={onCancel} className="lb-pc-small h-[46px] rounded-lg border border-line px-5 text-sm font-bold text-ink">Cancel</button>
					<button type="button" onClick={use} disabled={saving} className="lb-pc-small lb-pc-save h-[46px] rounded-lg border border-primary bg-primary px-5 text-sm font-bold text-on-primary">Use picture</button>
				</div>
			</div>
		</div>
	);
}
