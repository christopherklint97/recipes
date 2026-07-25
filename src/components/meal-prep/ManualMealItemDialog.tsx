import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { addManualMealPrepItemFn } from "../../server/functions/meal-preps.ts";
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

export function ManualMealItemDialog({
	mealPrepId,
	mealPrepName,
	open,
	onOpenChange,
}: {
	mealPrepId: string;
	mealPrepName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const qc = useQueryClient();
	const [title, setTitle] = useState("");
	const [amount, setAmount] = useState("");
	const [note, setNote] = useState("");
	useEffect(() => {
		if (!open) {
			setTitle("");
			setAmount("");
			setNote("");
		}
	}, [open]);
	const add = useMutation({
		mutationFn: () =>
			addManualMealPrepItemFn({
				data: { mealPrepId, title, amount: amount || null, note: note || null },
			}),
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
					<DialogTitle>Add a planned item</DialogTitle>
				</DialogHeader>
				<p className="text-sm text-muted-foreground">
					Add food to {mealPrepName} without creating a saved recipe.
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
						<Label htmlFor="manual-item-amount">
							Amount{" "}
							<span className="font-normal text-muted-foreground">
								(optional)
							</span>
						</Label>
						<Input
							id="manual-item-amount"
							value={amount}
							onChange={(event) => setAmount(event.target.value)}
							placeholder="2 portions, 500 g…"
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
					{add.isError && (
						<p role="alert" className="text-sm text-destructive">
							Could not add the item. Please try again.
						</p>
					)}
				</div>
				<DialogFooter>
					<Button
						onClick={() => add.mutate()}
						disabled={!title.trim() || add.isPending}
					>
						<Plus className="size-4" /> {add.isPending ? "Adding…" : "Add item"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
