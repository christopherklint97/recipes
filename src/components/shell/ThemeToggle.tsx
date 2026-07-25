import { Laptop, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../ui/button.tsx";

type ThemePreference = "auto" | "light" | "dark";
const THEMES: ThemePreference[] = ["auto", "light", "dark"];

function shouldUseDark(preference: ThemePreference) {
	if (preference === "dark") return true;
	if (preference === "light") return false;
	const hour = new Date().getHours();
	return (
		hour >= 18 ||
		hour < 6 ||
		window.matchMedia("(prefers-color-scheme: dark)").matches
	);
}

function applyTheme(preference: ThemePreference) {
	const dark = shouldUseDark(preference);
	document.documentElement.classList.toggle("dark", dark);
	document.documentElement.style.colorScheme = dark ? "dark" : "light";
	const themeColor = document.querySelector<HTMLMetaElement>(
		'meta[name="theme-color"]',
	);
	if (themeColor) themeColor.content = dark ? "#0a0a0a" : "#ffffff";
}

export function ThemeToggle() {
	const [preference, setPreference] = useState<ThemePreference>("auto");
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		const saved = localStorage.getItem("recipes-theme");
		setPreference(
			THEMES.includes(saved as ThemePreference)
				? (saved as ThemePreference)
				: "auto",
		);
		setHydrated(true);
	}, []);

	useEffect(() => {
		if (!hydrated) return;
		applyTheme(preference);
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const sync = () => applyTheme(preference);
		media.addEventListener("change", sync);
		const timer = window.setInterval(sync, 60_000);
		return () => {
			media.removeEventListener("change", sync);
			window.clearInterval(timer);
		};
	}, [hydrated, preference]);

	function cycle() {
		const next = THEMES[(THEMES.indexOf(preference) + 1) % THEMES.length];
		setPreference(next);
		localStorage.setItem("recipes-theme", next);
		applyTheme(next);
	}
	const Icon =
		preference === "dark" ? Moon : preference === "light" ? Sun : Laptop;
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			className="size-11 md:size-9"
			onClick={cycle}
			title={`Theme: ${preference}. Click to change.`}
			aria-label={`Theme: ${preference}. Click to change.`}
		>
			<Icon className="size-4" />
		</Button>
	);
}
