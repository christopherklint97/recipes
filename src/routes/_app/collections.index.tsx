import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
	ArrowDown,
	ArrowUp,
	Check,
	GripVertical,
	Pencil,
	Plus,
} from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../components/ui/card.tsx";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../../components/ui/dialog.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Label } from "../../components/ui/label.tsx";
import {
	createCollectionFn,
	listCollectionsFn,
	reorderCollectionsFn,
} from "../../server/functions/collections.ts";

export const Route = createFileRoute("/_app/collections/")({
	loader: () => listCollectionsFn(),
	component: CollectionsPage,
});

function CollectionsPage() {
	const initial = Route.useLoaderData();
	const qc = useQueryClient();
	const [editingOrder, setEditingOrder] = useState(false);
	const { data: collections = initial } = useQuery({
		queryKey: ["collections"],
		queryFn: () => listCollectionsFn(),
		initialData: initial,
	});
	const reorder = useMutation({
		mutationFn: (ids: string[]) => reorderCollectionsFn({ data: { ids } }),
		onMutate: async (ids) => {
			await qc.cancelQueries({ queryKey: ["collections"] });
			const previous = qc.getQueryData<typeof collections>(["collections"]);
			const byId = new Map(collections.map((item) => [item.id, item]));
			qc.setQueryData(
				["collections"],
				ids.flatMap((id, position) => {
					const item = byId.get(id);
					return item ? [{ ...item, position }] : [];
				}),
			);
			return { previous };
		},
		onError: (_error, _ids, context) => {
			if (context?.previous) qc.setQueryData(["collections"], context.previous);
		},
		onSettled: () => qc.invalidateQueries({ queryKey: ["collections"] }),
	});

	function move(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= collections.length || reorder.isPending) return;
		const ids = collections.map((item) => item.id);
		[ids[index], ids[target]] = [ids[target], ids[index]];
		reorder.mutate(ids);
	}

	return (
		<div className="mx-auto max-w-5xl space-y-6 px-4 py-5">
			<header className="flex items-start justify-between gap-3">
				<div>
					<h1 className="text-3xl font-semibold tracking-tight">Collections</h1>
					<p className="text-sm text-muted-foreground">
						{collections.length} cookbook{collections.length === 1 ? "" : "s"}
					</p>
				</div>
				<NewCollectionButton />
			</header>

			{collections.length > 1 && (
				<div className="flex items-center justify-between gap-3">
					{editingOrder ? (
						<p className="flex items-center gap-2 text-sm text-muted-foreground">
							<GripVertical className="size-4 shrink-0" /> Use the arrows to set
							the order shown throughout the app.
						</p>
					) : (
						<span />
					)}
					<Button
						variant="outline"
						size="sm"
						className="shrink-0"
						onClick={() => setEditingOrder((editing) => !editing)}
						aria-pressed={editingOrder}
					>
						{editingOrder ? (
							<Check className="size-4" />
						) : (
							<Pencil className="size-4" />
						)}
						{editingOrder ? "Done" : "Edit order"}
					</Button>
				</div>
			)}
			{reorder.isError && (
				<p role="alert" className="text-sm text-destructive">
					Could not save the new order. Please try again.
				</p>
			)}

			{collections.length === 0 ? (
				<div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
					Create a collection to organize favorites, weeknight dinners, or any
					theme.
				</div>
			) : (
				<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{collections.map((c, index) => (
						<li key={c.id}>
							<Card className="h-full transition hover:shadow-md">
								<CardHeader className="pb-2">
									<div className="flex items-start gap-2">
										<Link
											to="/collections/$id"
											params={{ id: c.id }}
											className="min-w-0 flex-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										>
											<CardTitle className="flex items-center gap-2">
												{c.icon && <span>{c.icon}</span>}
												{c.name}
											</CardTitle>
										</Link>
										{editingOrder && (
											<div className="flex shrink-0 gap-1">
												<Button
													variant="ghost"
													size="icon"
													className="size-11 sm:size-9"
													disabled={index === 0 || reorder.isPending}
													onClick={() => move(index, -1)}
													aria-label={`Move ${c.name} up`}
												>
													<ArrowUp className="size-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="size-11 sm:size-9"
													disabled={
														index === collections.length - 1 ||
														reorder.isPending
													}
													onClick={() => move(index, 1)}
													aria-label={`Move ${c.name} down`}
												>
													<ArrowDown className="size-4" />
												</Button>
											</div>
										)}
									</div>
								</CardHeader>
								<CardContent>
									<Link
										to="/collections/$id"
										params={{ id: c.id }}
										className="text-sm text-muted-foreground hover:text-foreground"
									>
										{c.recipeCount} recipe{c.recipeCount === 1 ? "" : "s"}
									</Link>
								</CardContent>
							</Card>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function NewCollectionButton() {
	const qc = useQueryClient();
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [icon, setIcon] = useState("");
	const create = useMutation({
		mutationFn: () =>
			createCollectionFn({
				data: { name, icon: icon.trim() || null },
			}),
		onSuccess: async () => {
			setOpen(false);
			setName("");
			setIcon("");
			await qc.invalidateQueries();
			await router.invalidate();
		},
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button>
					<Plus className="size-4" />
					New collection
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>New collection</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="coll-name">Name</Label>
						<Input
							id="coll-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Weeknight dinners"
							autoFocus
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="coll-icon">Icon (emoji)</Label>
						<Input
							id="coll-icon"
							value={icon}
							onChange={(e) => setIcon(e.target.value)}
							placeholder="🍝"
							maxLength={4}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button
						onClick={() => create.mutate()}
						disabled={!name.trim() || create.isPending}
					>
						{create.isPending ? "Creating…" : "Create"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
