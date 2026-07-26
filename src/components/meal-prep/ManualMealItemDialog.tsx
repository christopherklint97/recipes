import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
	image: string | null;
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
	const [image, setImage] = useState("");
	const [imageUploading, setImageUploading] = useState(false);
	const [amount, setAmount] = useState("");
	const [note, setNote] = useState("");
	const editing = Boolean(item);

	useEffect(() => {
		if (!open) return;
		setTitle(item?.title ?? "");
		setServings(item?.servings ?? 2);
		setImage(item?.image ?? "");
		setAmount(item?.amount ?? "");
		setNote(item?.note ?? "");
	}, [open, item]);

	const save = useMutation({
		mutationFn: () => {
			const data = {
				mealPrepId,
				title,
				servings,
				image: image || null,
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
			<DialogContent className="max-h-[calc(100dvh-2rem)] max-w-md overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{editing ? "Edit quick meal" : "Add a quick meal"}
					</DialogTitle>
				</DialogHeader>
				<p className="text-sm text-muted-foreground">
					{editing
						? `Update this quick meal in ${mealPrepName}.`
						: `Add a meal to ${mealPrepName} without creating a saved recipe.`}
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
					<QuickMealImagePicker
						value={image}
						onChange={setImage}
						onUploadingChange={setImageUploading}
					/>
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
							Could not {editing ? "save the changes" : "add the quick meal"}.
							Please try again.
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
							imageUploading ||
							save.isPending
						}
					>
						{editing ? (
							<Pencil className="size-4" />
						) : (
							<Plus className="size-4" />
						)}
						{save.isPending ? "Saving…" : editing ? "Save changes" : "Add meal"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function QuickMealImagePicker({
	value,
	onChange,
	onUploadingChange,
}: {
	value: string;
	onChange: (value: string) => void;
	onUploadingChange: (uploading: boolean) => void;
}) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function upload(file: File) {
		setError(null);
		setUploading(true);
		onUploadingChange(true);
		try {
			const body = new FormData();
			body.set("file", file);
			const response = await fetch("/api/upload/image", {
				method: "POST",
				body,
			});
			if (!response.ok) {
				const result = (await response.json().catch(() => null)) as {
					error?: string;
				} | null;
				throw new Error(result?.error ?? `Upload failed (${response.status})`);
			}
			const result = (await response.json()) as { path: string };
			onChange(result.path);
		} catch (uploadError) {
			setError(
				uploadError instanceof Error ? uploadError.message : "Upload failed",
			);
		} finally {
			setUploading(false);
			onUploadingChange(false);
		}
	}

	return (
		<div className="space-y-2">
			<Label>Photo (optional)</Label>
			<div className="flex items-center gap-3">
				<div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
					{value ? (
						<img
							src={value}
							alt="Quick meal preview"
							className="size-full object-cover"
						/>
					) : (
						<Upload className="size-5 text-muted-foreground" />
					)}
				</div>
				<div className="space-y-2">
					<Input
						ref={inputRef}
						type="file"
						accept="image/jpeg,image/png,image/webp"
						className="hidden"
						onChange={(event) => {
							const file = event.target.files?.[0];
							if (file) void upload(file);
						}}
					/>
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => inputRef.current?.click()}
							disabled={uploading}
						>
							<Upload className="size-4" />
							{uploading ? "Uploading…" : value ? "Replace" : "Add photo"}
						</Button>
						{value && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => onChange("")}
							>
								Remove
							</Button>
						)}
					</div>
					{error && <p className="text-sm text-destructive">{error}</p>}
				</div>
			</div>
		</div>
	);
}
