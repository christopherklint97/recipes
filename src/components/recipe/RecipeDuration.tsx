import { Clock } from "lucide-react";
import {
	formatRecipeDuration,
	type RecipeDurationSource,
	totalRecipeMinutes,
} from "../../lib/recipe-duration.ts";
import { cn } from "../../lib/utils.ts";

export function RecipeDuration({
	prepMinutes,
	cookMinutes,
	className,
}: RecipeDurationSource & { className?: string }) {
	const totalMinutes = totalRecipeMinutes({ prepMinutes, cookMinutes });
	if (totalMinutes === null) return null;

	return (
		<span className={cn("inline-flex items-center gap-1", className)}>
			<span className="sr-only">Total duration: </span>
			<Clock className="size-3.5" />
			{formatRecipeDuration(totalMinutes)}
		</span>
	);
}
