import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import {
	addManualMealPrepItemFn,
	updateManualMealPrepItemFn,
} from "../../server/functions/meal-preps.ts";
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

export type ManualMealItemValue = {
	id: string;
	title: string;
	servings: number;
	amount: string | null;
	note: string | null;
};

export function ManualMealItemDialog({
	mealPrepId,
	mealPrepName,
	item,
	open,
	onOpenChange,
}: {
	mealPrepId: string;
	mealPrepName: string;
	item?: ManualMealItemValue;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const qc = useQueryClient();
	const [title, setTitle] = useState("");
	const [servings, setServings] = useState(2);
	const [amount, setAmount] = useState("");
	const [note, setNote] = useState("");
	const editing = Boolean(item);

	useEffect(() => {
		if (!open) return;
		setTitle(item?.title ?? "");
		setServings(item?.servings ?? 2);
		setAmount(item?.amount ?? "");
		setNote(item?.note ?? "");
	}, [open, item]);

	const save = useMutation({
		mutationFn: () => {
			const data = {
				mealPrepId,
				title,
				servings,
				amount: amount || null,
				note: note || null,
			};
			return item
				? updateManualMealPrepItemFn({ data: { ...data, id: item.id } })
				: addManualMealPrepItemFn({ data });
		},
		onSuccess: async () => {
			await Promise.all([
				qc.invalidateQueries({ queryKey: ["meal-prep", mealPrepId] }),
				qc.invalidateQueries({ queryKey: ["meal-preps"] }),
				qc.invalidateQueries({ queryKey: ["current-week"] }),
			]);
			onOpenChange(false);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>
						{editing ? "Edit planned item" : "Add a planned item"}
					</DialogTitle>
				</DialogHeader>
				<p className="text-sm text-muted-foreground">
					{editing
						? `Update this item in ${mealPrepName}.`
						: `Add food to ${mealPrepName} without creating a saved recipe.`}
				</p>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="manual-item-title">Food or meal</Label>
						<Input
							id="manual-item-title"
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							placeholder="Yoghurt and berries"
							maxLength={120}
							autoFocus
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="manual-item-servings">Servings</Label>
						<Input
							id="manual-item-servings"
							type="number"
							inputMode="numeric"
							min={1}
							max={100}
							value={servings}
							onChange={(event) => setServings(Number(event.target.value))}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="manual-item-amount">
							Additional amount{" "}
							<span className="font-normal text-muted-foreground">
								(optional)
							</span>
						</Label>
						<Input
							id="manual-item-amount"
							value={amount}
							onChange={(event) => setAmount(event.target.value)}
							placeholder="500 g, 1 package…"
							maxLength={80}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="manual-item-note">
							Note{" "}
							<span className="font-normal text-muted-foreground">
								(optional)
							</span>
						</Label>
						<Input
							id="manual-item-note"
							value={note}
							onChange={(event) => setNote(event.target.value)}
							placeholder="Breakfast, buy on Monday…"
							maxLength={300}
						/>
					</div>
					{save.isError && (
						<p role="alert" className="text-sm text-destructive">
							Could not {editing ? "save the changes" : "add the item"}. Please
							try again.
						</p>
					)}
				</div>
				<DialogFooter>
					<Button
						onClick={() => save.mutate()}
						disabled={
							!title.trim() ||
							!Number.isInteger(servings) ||
							servings < 1 ||
							servings > 100 ||
							save.isPending
						}
					>
						{editing ? (
							<Pencil className="size-4" />
						) : (
							<Plus className="size-4" />
						)}
						{save.isPending ? "Saving…" : editing ? "Save changes" : "Add item"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
