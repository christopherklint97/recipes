import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Plus } from "lucide-react";
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
} from "../../server/functions/collections.ts";

export const Route = createFileRoute("/_app/collections/")({
	loader: () => listCollectionsFn(),
	component: CollectionsPage,
});

function CollectionsPage() {
	const collections = Route.useLoaderData();
	return (
		<div className="mx-auto max-w-5xl space-y-6 p-6">
			<header className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-semibold tracking-tight">Collections</h1>
					<p className="text-muted-foreground">
						{collections.length} cookbook{collections.length === 1 ? "" : "s"}
					</p>
				</div>
				<NewCollectionButton />
			</header>

			{collections.length === 0 ? (
				<div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
					Create a collection to organize favorites, weeknight dinners, or any
					theme.
				</div>
			) : (
				<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{collections.map((c) => (
						<li key={c.id}>
							<Link
								to="/collections/$id"
								params={{ id: c.id }}
								className="block focus-visible:outline-none"
							>
								<Card className="transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring">
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											{c.icon && <span>{c.icon}</span>}
											{c.name}
										</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-sm text-muted-foreground">
											{c.recipeCount} recipe
											{c.recipeCount === 1 ? "" : "s"}
										</p>
									</CardContent>
								</Card>
							</Link>
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
