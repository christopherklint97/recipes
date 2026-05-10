import { useEffect, useState } from "react";
import { Button } from "../ui/button.tsx";

export function UpdatePrompt() {
	const [needsRefresh, setNeedsRefresh] = useState(false);
	const [updateSW, setUpdateSW] = useState<(() => Promise<void>) | null>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const mod = await import("virtual:pwa-register");
				const update = mod.registerSW({
					onNeedRefresh() {
						if (!cancelled) setNeedsRefresh(true);
					},
				});
				if (!cancelled) {
					setUpdateSW(() => async () => {
						await update(true);
					});
				}
			} catch {
				// SW disabled (dev mode or unsupported) — silent
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	if (!needsRefresh || !updateSW) return null;

	return (
		<div className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-full border bg-card px-4 py-2 shadow-lg md:bottom-6">
			<div className="flex items-center gap-3 text-sm">
				<span>A new version is available.</span>
				<Button size="sm" onClick={() => void updateSW()}>
					Reload
				</Button>
			</div>
		</div>
	);
}
