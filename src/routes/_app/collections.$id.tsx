import { useMutation } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	notFound,
	useRouter,
} from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button.tsx";
import {
	deleteCollectionFn,
	getCollectionFn,
} from "../../server/functions/collections.ts";

export const Route = createFileRoute("/_app/collections/$id")({
	loader: async ({ params }) => {
		const c = await getCollectionFn({ data: { id: params.id } });
		if (!c) throw notFound();
		return c;
	},
	component: CollectionPage,
});

function CollectionPage() {
	const collection = Route.useLoaderData();
	const router = useRouter();

	const del = useMutation({
		mutationFn: () => deleteCollectionFn({ data: { id: collection.id } }),
		onSuccess: () => {
			void router.navigate({ to: "/collections" });
		},
	});

	return (
		<div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5">
			<header className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
						{collection.icon && <span>{collection.icon}</span>}
						{collection.name}
					</h1>
					<p className="text-sm text-muted-foreground">
						{collection.recipes.length} recipe
						{collection.recipes.length === 1 ? "" : "s"}
					</p>
				</div>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => {
						if (confirm(`Delete collection "${collection.name}"?`)) {
							del.mutate();
						}
					}}
					disabled={del.isPending}
				>
					<Trash2 className="size-4" />
					Delete
				</Button>
			</header>

			{collection.recipes.length === 0 ? (
				<div className="rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
					This collection is empty. Add recipes from the recipe page.
				</div>
			) : (
				<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{collection.recipes.map((r) => (
						<li key={r.id}>
							<Link
								to="/recipes/$id"
								params={{ id: r.id }}
								className="group block overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								{r.heroImage ? (
									<img
										src={r.heroImage}
										alt=""
										className="block aspect-[4/3] w-full object-cover"
									/>
								) : (
									<div className="aspect-[4/3] w-full bg-muted" />
								)}
								<div className="space-y-1 p-4">
									<h3 className="line-clamp-2 font-semibold leading-snug">
										{r.title}
									</h3>
									{r.description && (
										<p className="line-clamp-2 text-sm text-muted-foreground">
											{r.description}
										</p>
									)}
								</div>
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
