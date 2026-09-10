import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
	formatWeek,
	formatWeekRange,
	normalizeToWeekStart,
	weekStartFromOffset,
} from "../../lib/week.ts";
import { updateMealPrepFn } from "../../server/functions/meal-preps.ts";
import { Button } from "../ui/button.tsx";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog.tsx";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";

const appRoute = getRouteApi("/_app");

export function EditMealPrepDialog({
	mealPrep,
	open,
	onOpenChange,
}: {
	mealPrep: { id: string; name: string; weekStart: string };
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const qc = useQueryClient();
	const { weekStartsOn } = appRoute.useLoaderData();
	const [name, setName] = useState(mealPrep.name);
	const [weekStart, setWeekStart] = useState(mealPrep.weekStart);
	useEffect(() => {
		if (!open) return;
		setName(mealPrep.name);
		setWeekStart(mealPrep.weekStart);
	}, [open, mealPrep.name, mealPrep.weekStart]);
	const update = useMutation({
		mutationFn: () =>
			updateMealPrepFn({ data: { id: mealPrep.id, name, weekStart } }),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ["meal-prep", mealPrep.id] });
			await qc.invalidateQueries({ queryKey: ["meal-preps"] });
			onOpenChange(false);
		},
	});
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit meal prep</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="edit-meal-name">Name</Label>
						<Input
							id="edit-meal-name"
							value={name}
							onChange={(event) => setName(event.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="edit-meal-week">Week</Label>
						<div className="flex flex-wrap gap-2">
							{[
								["This week", 0],
								["Next week", 1],
								["In two weeks", 2],
							].map(([label, offset]) => (
								<Button
									key={label}
									type="button"
									size="sm"
									variant={
										weekStart ===
										weekStartFromOffset(
											Number(offset),
											new Date(),
											weekStartsOn,
										)
											? "secondary"
											: "outline"
									}
									onClick={() =>
										setWeekStart(
											weekStartFromOffset(
												Number(offset),
												new Date(),
												weekStartsOn,
											),
										)
									}
								>
									{label}
								</Button>
							))}
						</div>
						<Input
							id="edit-meal-week"
							type="date"
							value={weekStart}
							onChange={(event) =>
								setWeekStart(
									normalizeToWeekStart(event.target.value, weekStartsOn),
								)
							}
						/>
						<p className="text-xs text-muted-foreground">
							{formatWeek(weekStart)} · {formatWeekRange(weekStart)}
						</p>
					</div>
				</div>
				<DialogFooter>
					<Button
						onClick={() => update.mutate()}
						disabled={!name.trim() || update.isPending}
					>
						{update.isPending ? "Saving…" : "Save changes"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
