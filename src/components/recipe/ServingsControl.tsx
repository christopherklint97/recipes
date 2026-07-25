import { Minus, Plus, RotateCcw, Users } from "lucide-react";
import { Button } from "../ui/button.tsx";
import { Input } from "../ui/input.tsx";

export function ServingsControl({
	value,
	baseValue,
	onChange,
	compact = false,
}: {
	value: number;
	baseValue: number;
	onChange: (value: number) => void;
	compact?: boolean;
}) {
	const set = (next: number) => onChange(Math.max(1, Math.min(100, next)));
	return (
		<fieldset
			className="m-0 flex flex-wrap items-center gap-2 border-0 p-0"
			aria-label="Adjust servings"
		>
			<Users className="size-4 text-muted-foreground" aria-hidden="true" />
			<Button
				type="button"
				variant="outline"
				size="icon"
				className="size-11 sm:size-9"
				onClick={() => set(value - 1)}
				disabled={value <= 1}
				aria-label="Decrease servings"
			>
				<Minus className="size-4" />
			</Button>
			<Input
				type="number"
				inputMode="numeric"
				min={1}
				max={100}
				value={value}
				onChange={(event) => {
					const next = Number(event.target.value);
					if (Number.isInteger(next) && next > 0) set(next);
				}}
				className="h-11 w-16 text-center font-medium tabular-nums sm:h-9"
				aria-label="Servings"
			/>
			<Button
				type="button"
				variant="outline"
				size="icon"
				className="size-11 sm:size-9"
				onClick={() => set(value + 1)}
				disabled={value >= 100}
				aria-label="Increase servings"
			>
				<Plus className="size-4" />
			</Button>
			{!compact && (
				<span className="text-sm text-muted-foreground">servings</span>
			)}
			{value !== baseValue && (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => onChange(baseValue)}
				>
					<RotateCcw className="size-3.5" /> Reset
				</Button>
			)}
		</fieldset>
	);
}
