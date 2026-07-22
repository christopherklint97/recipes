import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check, Minus, Plus, ShoppingCart, Undo2, X } from "lucide-react";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	listShoppingFn,
	restoreShoppingRecipesFn,
	setShoppingRecipesFn,
} from "../../server/functions/shopping.ts";
import { Button } from "../ui/button.tsx";
import { Checkbox } from "../ui/checkbox.tsx";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog.tsx";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";

export type MealPrepRecipe = {
	id: string;
	title: string;
	heroImage?: string | null;
	servings: number;
	ingredientCount?: number;
};

type PlannedRecipe = MealPrepRecipe & {
	selected: boolean;
	servingsPerBatch: number;
	batches: number;
};

type MealPrepContextValue = {
	openMealPrep: (recipes: MealPrepRecipe[]) => void;
};

const MealPrepContext = createContext<MealPrepContextValue | null>(null);

export function useMealPrep() {
	const value = useContext(MealPrepContext);
	if (!value)
		throw new Error("useMealPrep must be used within MealPrepProvider");
	return value;
}

export function MealPrepProvider({ children }: { children: ReactNode }) {
	const qc = useQueryClient();
	const [open, setOpen] = useState(false);
	const [planned, setPlanned] = useState<PlannedRecipe[]>([]);
	const [toast, setToast] = useState<{
		message: string;
		restore: Array<{ recipeId: string; servings: number | null }>;
	} | null>(null);

	const shoppingQ = useQuery({
		queryKey: ["shopping"],
		queryFn: () => listShoppingFn(),
		staleTime: 30_000,
	});

	const openMealPrep = useCallback((recipes: MealPrepRecipe[]) => {
		const unique = Array.from(
			new Map(recipes.map((recipe) => [recipe.id, recipe])).values(),
		);
		setPlanned(
			unique.map((recipe) => ({
				...recipe,
				selected: true,
				servingsPerBatch: recipe.servings,
				batches: 1,
			})),
		);
		setOpen(true);
	}, []);

	const add = useMutation({
		mutationFn: (recipes: Array<{ recipeId: string; servings: number }>) =>
			setShoppingRecipesFn({ data: { recipes } }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping"] }),
	});

	const undo = useMutation({
		mutationFn: (
			restore: Array<{ recipeId: string; servings: number | null }>,
		) => restoreShoppingRecipesFn({ data: { restore } }),
		onSuccess: () => {
			setToast(null);
			void qc.invalidateQueries({ queryKey: ["shopping"] });
		},
	});

	useEffect(() => {
		if (!toast) return;
		const timer = window.setTimeout(() => setToast(null), 7000);
		return () => window.clearTimeout(timer);
	}, [toast]);

	const active = planned.filter((recipe) => recipe.selected);
	const totalServings = active.reduce(
		(sum, recipe) => sum + recipe.servingsPerBatch * recipe.batches,
		0,
	);
	const ingredientLines = active.reduce(
		(sum, recipe) => sum + (recipe.ingredientCount ?? 0),
		0,
	);
	const existingById = useMemo(
		() =>
			new Map(
				(shoppingQ.data?.pickedRecipes ?? []).map((recipe) => [
					recipe.recipeId,
					recipe.servings,
				]),
			),
		[shoppingQ.data],
	);

	function updateRecipe(id: string, update: Partial<PlannedRecipe>) {
		setPlanned((current) =>
			current.map((recipe) =>
				recipe.id === id ? { ...recipe, ...update } : recipe,
			),
		);
	}

	function setAllServings(value: number) {
		setPlanned((current) =>
			current.map((recipe) =>
				recipe.selected
					? {
							...recipe,
							servingsPerBatch: Math.max(
								1,
								Math.min(Math.floor(100 / recipe.batches), value),
							),
						}
					: recipe,
			),
		);
	}

	async function addToShopping() {
		if (active.length === 0) return;
		const recipes = active.map((recipe) => ({
			recipeId: recipe.id,
			servings: recipe.servingsPerBatch * recipe.batches,
		}));
		const restore = recipes.map((recipe) => ({
			recipeId: recipe.recipeId,
			servings: existingById.get(recipe.recipeId) ?? null,
		}));
		try {
			await add.mutateAsync(recipes);
		} catch {
			return;
		}
		setOpen(false);
		setToast({
			message: `${recipes.length} recipe${recipes.length === 1 ? "" : "s"} added to Shopping`,
			restore,
		});
	}

	return (
		<MealPrepContext.Provider value={{ openMealPrep }}>
			{children}
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Review meal prep</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="grid grid-cols-3 gap-2 rounded-xl bg-muted p-3 text-center">
							<Summary value={active.length} label="recipes" />
							<Summary value={totalServings} label="servings" />
							<Summary value={ingredientLines} label="ingredient lines" />
						</div>

						<div className="flex flex-wrap items-end gap-2">
							<div className="space-y-1">
								<Label
									htmlFor="all-servings"
									className="text-xs text-muted-foreground"
								>
									Set servings for all
								</Label>
								<Input
									id="all-servings"
									type="number"
									min={1}
									max={100}
									className="w-28"
									onChange={(event) => {
										const value = Number(event.target.value);
										if (Number.isFinite(value) && value > 0)
											setAllServings(value);
									}}
								/>
							</div>
							<Button
								variant="ghost"
								size="sm"
								onClick={() =>
									setPlanned((current) =>
										current.map((recipe) => ({ ...recipe, selected: true })),
									)
								}
							>
								Select all
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() =>
									setPlanned((current) =>
										current.map((recipe) => ({ ...recipe, selected: false })),
									)
								}
							>
								Clear
							</Button>
						</div>

						<ul className="max-h-[52vh] space-y-2 overflow-auto pr-1">
							{planned.map((recipe) => (
								<li
									key={recipe.id}
									className={`rounded-xl border p-3 ${recipe.selected ? "border-primary/60 bg-primary/5" : "opacity-60"}`}
								>
									<div className="flex items-center gap-3">
										<Checkbox
											checked={recipe.selected}
											onCheckedChange={(value) =>
												updateRecipe(recipe.id, { selected: value === true })
											}
											aria-label={`Include ${recipe.title}`}
										/>
										{recipe.heroImage ? (
											<img
												src={recipe.heroImage}
												alt=""
												className="size-11 rounded-md object-cover"
											/>
										) : (
											<div className="size-11 rounded-md bg-muted" />
										)}
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-medium">
												{recipe.title}
											</p>
											<p className="text-xs text-muted-foreground">
												{existingById.has(recipe.id)
													? `Currently ${existingById.get(recipe.id)} servings in Shopping`
													: `${recipe.ingredientCount ?? 0} ingredient lines`}
											</p>
										</div>
										<button
											type="button"
											className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
											onClick={() =>
												setPlanned((current) =>
													current.filter((item) => item.id !== recipe.id),
												)
											}
											aria-label={`Remove ${recipe.title}`}
										>
											<X className="size-4" />
										</button>
									</div>

									{recipe.selected && (
										<div className="mt-3 grid gap-3 sm:grid-cols-2">
											<QuantityControl
												label="Servings per batch"
												value={recipe.servingsPerBatch}
												max={Math.floor(100 / recipe.batches)}
												onChange={(value) =>
													updateRecipe(recipe.id, { servingsPerBatch: value })
												}
											/>
											<div className="space-y-1">
												<Label className="text-xs text-muted-foreground">
													Batches
												</Label>
												<div className="flex gap-1">
													{[1, 2, 3].map((batches) => (
														<Button
															key={batches}
															type="button"
															size="sm"
															variant={
																recipe.batches === batches
																	? "default"
																	: "outline"
															}
															onClick={() =>
																updateRecipe(recipe.id, {
																	batches,
																	servingsPerBatch: Math.min(
																		recipe.servingsPerBatch,
																		Math.floor(100 / batches),
																	),
																})
															}
														>
															{batches}×
														</Button>
													))}
												</div>
											</div>
										</div>
									)}
								</li>
							))}
						</ul>
						{add.isError && (
							<p role="alert" className="text-sm text-destructive">
								Could not update the shopping list. Please try again.
							</p>
						)}

						<div className="flex items-center justify-between gap-3 border-t pt-3">
							<p className="text-sm text-muted-foreground">
								{active.length} selected · {totalServings} servings
							</p>
							<Button
								disabled={
									active.length === 0 || add.isPending || shoppingQ.isPending
								}
								onClick={addToShopping}
							>
								<ShoppingCart className="size-4" />
								{add.isPending ? "Adding…" : "Add to shopping"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{toast && (
				<div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-lg items-center gap-2 rounded-xl border bg-background p-3 shadow-lg md:bottom-5">
					<Check className="size-5 shrink-0 text-primary" />
					<span className="flex-1 text-sm font-medium">
						{undo.isError ? "Could not undo. Please try again." : toast.message}
					</span>
					<Button asChild variant="outline" size="sm">
						<Link to="/shopping" onClick={() => setToast(null)}>
							View list
						</Link>
					</Button>
					<Button
						variant="ghost"
						size="sm"
						disabled={undo.isPending}
						onClick={() => undo.mutate(toast.restore)}
					>
						<Undo2 className="size-4" />
						Undo
					</Button>
				</div>
			)}
		</MealPrepContext.Provider>
	);
}

function Summary({ value, label }: { value: number; label: string }) {
	return (
		<div>
			<p className="text-lg font-semibold tabular-nums">{value}</p>
			<p className="text-[11px] text-muted-foreground">{label}</p>
		</div>
	);
}

function QuantityControl({
	label,
	value,
	max,
	onChange,
}: {
	label: string;
	value: number;
	max: number;
	onChange: (value: number) => void;
}) {
	return (
		<div className="space-y-1">
			<Label className="text-xs text-muted-foreground">{label}</Label>
			<div className="flex items-center gap-1">
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="size-9"
					onClick={() => onChange(Math.max(1, value - 1))}
					aria-label={`Decrease ${label.toLowerCase()}`}
				>
					<Minus className="size-4" />
				</Button>
				<Input
					type="number"
					min={1}
					max={max}
					value={value}
					className="h-9 w-20 text-center tabular-nums"
					onChange={(event) => {
						const next = Number(event.target.value);
						if (Number.isFinite(next) && next > 0)
							onChange(Math.min(max, next));
					}}
				/>
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="size-9"
					onClick={() => onChange(Math.min(max, value + 1))}
					aria-label={`Increase ${label.toLowerCase()}`}
				>
					<Plus className="size-4" />
				</Button>
			</div>
		</div>
	);
}
