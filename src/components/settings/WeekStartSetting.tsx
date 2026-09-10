import type { WeekStartsOn } from "../../lib/week.ts";
import { Label } from "../ui/label.tsx";

export function WeekStartSetting({
	value,
	onChange,
	saving,
}: {
	value: WeekStartsOn;
	onChange: (value: WeekStartsOn) => void;
	saving: boolean;
}) {
	return (
		<div className="space-y-2">
			<Label htmlFor="week-start">Start of week</Label>
			<select
				id="week-start"
				value={value}
				disabled={saving}
				onChange={(event) => onChange(event.target.value as WeekStartsOn)}
				className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-64"
			>
				<option value="sunday">Sunday</option>
				<option value="monday">Monday</option>
			</select>
			<p className="text-sm text-muted-foreground">
				Weekly plans and date ranges begin on this day.
			</p>
		</div>
	);
}
