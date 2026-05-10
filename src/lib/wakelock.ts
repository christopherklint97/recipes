import { useEffect } from "react";

export function useWakeLock(active: boolean): void {
	useEffect(() => {
		if (!active) return;
		if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

		let sentinel: WakeLockSentinel | null = null;
		let cancelled = false;

		async function acquire() {
			try {
				const s = await navigator.wakeLock.request("screen");
				if (cancelled) {
					await s.release();
					return;
				}
				sentinel = s;
			} catch {
				// permission denied or unsupported — silent
			}
		}

		function onVisibility() {
			if (document.visibilityState === "visible" && active && !sentinel) {
				void acquire();
			}
		}

		void acquire();
		document.addEventListener("visibilitychange", onVisibility);

		return () => {
			cancelled = true;
			document.removeEventListener("visibilitychange", onVisibility);
			if (sentinel && !sentinel.released) {
				void sentinel.release();
			}
			sentinel = null;
		};
	}, [active]);
}
