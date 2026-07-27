export function formatGoogleKeepChecklist(lines: string[]): string {
	return lines
		.map((line) => line.replace(/\r?\n/g, " ").trim())
		.filter(Boolean)
		.join("\n");
}
