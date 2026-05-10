import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Minus, Plus, Search, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button.tsx";
import { Checkbox } from "../../components/ui/checkbox.tsx";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../../components/ui/dialog.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Label } from "../../components/ui/label.tsx";
import { listRecipesFn } from "../../server/functions/recipes.ts";
import {
	addManualItemFn,
	clearShoppingFn,
	deleteManualItemFn,
	listShoppingFn,
	removeShoppingRecipeFn,
	setAggregateCheckedFn,
	setShoppingRecipeFn,
	toggleManualItemFn,
} from "../../server/functions/shopping.ts";

export const Route = createFileRoute("/_app/shopping")({
	loader: () => listShoppingFn(),
	component: ShoppingPage,
});

function formatQty(q: number): string {
	if (Number.isInteger(q)) return String(q);
	return q.toFixed(q < 10 ? 2 : 1).replace(/\.?0+$/, "");
}

function ShoppingPage() {
	const initial = Route.useLoaderData();
	const qc = useQueryClient();

	const dataQ = useQuery({
		queryKey: ["shopping"],
		queryFn: () => listShoppingFn(),
		initialData: initial,
	});
	const data = dataQ.data;

	const setRecipe = useMutation({
		mutationFn: (vars: { recipeId: string; servings: number }) =>
			setShoppingRecipeFn({ data: vars }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping"] }),
	});

	const removeRecipe = useMutation({
		mutationFn: (recipeId: string) =>
			removeShoppingRecipeFn({ data: { recipeId } }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping"] }),
	});

	const checkAgg = useMutation({
		mutationFn: (vars: { key: string; checked: boolean }) =>
			setAggregateCheckedFn({ data: vars }),
		onMutate: async (vars) => {
			await qc.cancelQueries({ queryKey: ["shopping"] });
			const prev = qc.getQueryData<typeof data>(["shopping"]);
			qc.setQueryData<typeof data>(["shopping"], (old) =>
				old
					? {
							...old,
							aggregated: old.aggregated.map((a) =>
								a.key === vars.key ? { ...a, checked: vars.checked } : a,
							),
						}
					: old,
			);
			return { prev };
		},
		onError: (_e, _v, ctx) => {
			if (ctx?.prev) qc.setQueryData(["shopping"], ctx.prev);
		},
		onSettled: () => qc.invalidateQueries({ queryKey: ["shopping"] }),
	});

	const toggleManual = useMutation({
		mutationFn: (vars: { id: string; checked: boolean }) =>
			toggleManualItemFn({ data: vars }),
		onMutate: async (vars) => {
			await qc.cancelQueries({ queryKey: ["shopping"] });
			const prev = qc.getQueryData<typeof data>(["shopping"]);
			qc.setQueryData<typeof data>(["shopping"], (old) =>
				old
					? {
							...old,
							manual: old.manual.map((m) =>
								m.id === vars.id ? { ...m, checked: vars.checked } : m,
							),
						}
					: old,
			);
			return { prev };
		},
		onError: (_e, _v, ctx) => {
			if (ctx?.prev) qc.setQueryData(["shopping"], ctx.prev);
		},
		onSettled: () => qc.invalidateQueries({ queryKey: ["shopping"] }),
	});

	const delManual = useMutation({
		mutationFn: (id: string) => deleteManualItemFn({ data: { id } }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping"] }),
	});

	const clearAll = useMutation({
		mutationFn: () => clearShoppingFn(),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping"] }),
	});

	const totalCount = data.aggregated.length + data.manual.length;
	const doneCount =
		data.aggregated.filter((a) => a.checked).length +
		data.manual.filter((m) => m.checked).length;

	return (
		<div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-5">
			<header className="space-y-1">
				<h1 className="text-3xl font-semibold tracking-tight">Shopping</h1>
				<p className="text-sm text-muted-foreground">
					{totalCount} item{totalCount === 1 ? "" : "s"}
					{doneCount > 0 && ` · ${doneCount} done`}
				</p>
			</header>

			<div className="flex flex-wrap gap-2">
				<RecipePickerDialog
					selectedIds={new Set(data.pickedRecipes.map((r) => r.recipeId))}
					onAdd={(recipeId, servings) =>
						setRecipe.mutate({ recipeId, servings })
					}
				/>
				{(data.pickedRecipes.length > 0 || data.manual.length > 0) && (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							if (confirm("Clear all picked recipes and items?")) {
								clearAll.mutate();
							}
						}}
					>
						Clear all
					</Button>
				)}
			</div>

			{data.pickedRecipes.length > 0 && (
				<section className="space-y-2">
					<h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Cooking
					</h2>
					<ul className="space-y-2">
						{data.pickedRecipes.map((r) => (
							<li
								key={r.recipeId}
								className="flex items-center gap-3 rounded-xl border bg-card p-2"
							>
								{r.heroImage ? (
									<img
										src={r.heroImage}
										alt=""
										className="size-12 shrink-0 rounded-md object-cover"
									/>
								) : (
									<div className="size-12 shrink-0 rounded-md bg-muted" />
								)}
								<span className="flex-1 truncate text-sm font-medium">
									{r.title}
								</span>
								<ServingsStepper
									value={r.servings}
									onChange={(v) =>
										setRecipe.mutate({ recipeId: r.recipeId, servings: v })
									}
								/>
								<button
									type="button"
									className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
									onClick={() => removeRecipe.mutate(r.recipeId)}
									aria-label="Remove recipe"
								>
									<X className="size-4" />
								</button>
							</li>
						))}
					</ul>
				</section>
			)}

			<AddManualForm />

			{totalCount === 0 ? (
				<div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
					Pick a recipe to start your shopping list, or add items manually.
				</div>
			) : (
				<div className="space-y-5">
					{data.aggregated.length > 0 && (
						<section className="space-y-2">
							<h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								From recipes
							</h2>
							<ul className="divide-y rounded-xl border bg-card">
								{data.aggregated.map((item) => (
									<li
										key={item.key}
										className="flex items-center gap-3 px-3 py-2.5"
									>
										<Checkbox
											checked={item.checked}
											onCheckedChange={(v) =>
												checkAgg.mutate({ key: item.key, checked: v === true })
											}
										/>
										<div
											className={`flex flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 ${
												item.checked ? "text-muted-foreground line-through" : ""
											}`}
										>
											{item.quantity != null && (
												<span className="text-sm font-semibold tabular-nums">
													{formatQty(item.quantity)}
													{item.unknownQty ? "+" : ""}
												</span>
											)}
											{item.unit && (
												<span className="text-xs text-muted-foreground">
													{item.unit}
												</span>
											)}
											<span className="text-sm">{item.ingredientName}</span>
											{item.fromRecipes.length > 1 && (
												<span className="text-[11px] text-muted-foreground">
													({item.fromRecipes.length} recipes)
												</span>
											)}
										</div>
									</li>
								))}
							</ul>
						</section>
					)}

					{data.manual.length > 0 && (
						<section className="space-y-2">
							<h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Manual
							</h2>
							<ul className="divide-y rounded-xl border bg-card">
								{data.manual.map((m) => (
									<li
										key={m.id}
										className="flex items-center gap-3 px-3 py-2.5"
									>
										<Checkbox
											checked={m.checked}
											onCheckedChange={(v) =>
												toggleManual.mutate({
													id: m.id,
													checked: v === true,
												})
											}
										/>
										<div
											className={`flex flex-1 flex-wrap items-baseline gap-x-2 ${
												m.checked ? "text-muted-foreground line-through" : ""
											}`}
										>
											{m.quantity != null && (
												<span className="text-sm font-semibold tabular-nums">
													{formatQty(m.quantity)}
												</span>
											)}
											{m.unit && (
												<span className="text-xs text-muted-foreground">
													{m.unit}
												</span>
											)}
											<span className="text-sm">{m.ingredientName}</span>
										</div>
										<button
											type="button"
											className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
											onClick={() => delManual.mutate(m.id)}
											aria-label="Remove"
										>
											<Trash2 className="size-4" />
										</button>
									</li>
								))}
							</ul>
						</section>
					)}
				</div>
			)}
		</div>
	);
}

function ServingsStepper({
	value,
	onChange,
}: {
	value: number;
	onChange: (v: number) => void;
}) {
	return (
		<div className="flex items-center gap-1 rounded-md border">
			<button
				type="button"
				className="grid h-7 w-7 place-items-center text-muted-foreground hover:text-foreground"
				onClick={() => onChange(Math.max(1, value - 1))}
				aria-label="Fewer servings"
			>
				<Minus className="size-3.5" />
			</button>
			<span className="min-w-6 text-center text-sm tabular-nums">{value}</span>
			<button
				type="button"
				className="grid h-7 w-7 place-items-center text-muted-foreground hover:text-foreground"
				onClick={() => onChange(Math.min(100, value + 1))}
				aria-label="More servings"
			>
				<Plus className="size-3.5" />
			</button>
		</div>
	);
}

function RecipePickerDialog({
	selectedIds,
	onAdd,
}: {
	selectedIds: Set<string>;
	onAdd: (recipeId: string, servings: number) => void;
}) {
	const [open, setOpen] = useState(false);
	const [q, setQ] = useState("");
	const recipesQ = useQuery({
		queryKey: ["recipes", { q }],
		queryFn: () => listRecipesFn({ data: { q } }),
		enabled: open,
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button>
					<Plus className="size-4" />
					Add recipe
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Pick a recipe</DialogTitle>
				</DialogHeader>
				<div className="space-y-3">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={q}
							onChange={(e) => setQ(e.target.value)}
							placeholder="Search recipes…"
							className="pl-9"
						/>
					</div>
					<ul className="max-h-80 space-y-1 overflow-auto">
						{(recipesQ.data ?? []).map((r) => {
							const already = selectedIds.has(r.id);
							return (
								<li key={r.id}>
									<button
										type="button"
										disabled={already}
										onClick={() => {
											onAdd(r.id, r.servings);
											setOpen(false);
										}}
										className="flex w-full items-center gap-3 rounded-md border p-2 text-left text-sm enabled:hover:bg-accent disabled:opacity-50"
									>
										{r.heroImage ? (
											<img
												src={r.heroImage}
												alt=""
												className="size-10 shrink-0 rounded object-cover"
											/>
										) : (
											<div className="size-10 shrink-0 rounded bg-muted" />
										)}
										<span className="flex-1 line-clamp-2 font-medium">
											{r.title}
										</span>
										{already && (
											<span className="text-[11px] uppercase text-muted-foreground">
												Added
											</span>
										)}
									</button>
								</li>
							);
						})}
						{recipesQ.data?.length === 0 && (
							<li className="p-4 text-center text-sm text-muted-foreground">
								No recipes found.
							</li>
						)}
					</ul>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function AddManualForm() {
	const qc = useQueryClient();
	const [name, setName] = useState("");
	const [qty, setQty] = useState("");
	const [unit, setUnit] = useState("");
	const add = useMutation({
		mutationFn: () =>
			addManualItemFn({
				data: {
					ingredientName: name,
					quantity: qty === "" ? null : Number(qty),
					unit: unit.trim() || null,
				},
			}),
		onSuccess: () => {
			setName("");
			setQty("");
			setUnit("");
			void qc.invalidateQueries({ queryKey: ["shopping"] });
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				if (name.trim()) add.mutate();
			}}
			className="grid grid-cols-12 gap-2"
		>
			<div className="col-span-3 space-y-1">
				<Label
					htmlFor="qty"
					className="text-xs uppercase text-muted-foreground"
				>
					Qty
				</Label>
				<Input
					id="qty"
					inputMode="decimal"
					value={qty}
					onChange={(e) => setQty(e.target.value)}
				/>
			</div>
			<div className="col-span-3 space-y-1">
				<Label
					htmlFor="unit"
					className="text-xs uppercase text-muted-foreground"
				>
					Unit
				</Label>
				<Input
					id="unit"
					value={unit}
					onChange={(e) => setUnit(e.target.value)}
				/>
			</div>
			<div className="col-span-6 space-y-1">
				<Label
					htmlFor="name"
					className="text-xs uppercase text-muted-foreground"
				>
					Item
				</Label>
				<div className="flex gap-2">
					<Input
						id="name"
						placeholder="Avocado"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
					<Button type="submit" disabled={!name.trim() || add.isPending}>
						<Plus className="size-4" />
					</Button>
				</div>
			</div>
		</form>
	);
}
