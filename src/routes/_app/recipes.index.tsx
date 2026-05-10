import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Download, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Badge } from "../../components/ui/badge.tsx";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";
import { listRecipesFn } from "../../server/functions/recipes.ts";
import { listRecipesByTagFn } from "../../server/functions/tags.ts";

const search = z.object({ tag: z.string().optional() });

export const Route = createFileRoute("/_app/recipes/")({
	validateSearch: search,
	loaderDeps: ({ search: s }) => ({ tag: s.tag }),
	loader: ({ deps }) =>
		deps.tag
			? listRecipesByTagFn({ data: { tag: deps.tag } })
			: listRecipesFn(),
	component: RecipesPage,
});

function RecipesPage() {
	const initial = Route.useLoaderData();
	const { tag } = Route.useSearch();
	const navigate = useNavigate();
	const [q, setQ] = useState("");

	const { data: recipes = initial } = useQuery({
		queryKey: ["recipes", { q, tag: tag ?? null }],
		queryFn: () =>
			tag
				? listRecipesByTagFn({ data: { tag } })
				: listRecipesFn({ data: { q } }),
		initialData: q === "" && !tag ? initial : undefined,
		placeholderData: (prev) => prev,
	});

	const filtered =
		tag || q === ""
			? recipes
			: recipes.filter((r) =>
					`${r.title} ${r.description ?? ""}`
						.toLowerCase()
						.includes(q.toLowerCase()),
				);

	function clearTag() {
		void navigate({ to: "/recipes", search: {} as never });
	}

	return (
		<div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5">
			<header className="flex items-center justify-between gap-3">
				<div className="min-w-0">
					<h1 className="text-3xl font-semibold tracking-tight">Recipes</h1>
					<p className="text-sm text-muted-foreground">
						{filtered.length} saved
					</p>
				</div>
				<div className="flex shrink-0 gap-2">
					<Button asChild variant="outline" size="sm">
						<Link to="/import">
							<Download className="size-4" />
							Import
						</Link>
					</Button>
					<Button asChild size="sm">
						<Link to="/recipes/new">
							<Plus className="size-4" />
							New
						</Link>
					</Button>
				</div>
			</header>

			<div className="space-y-3">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={q}
						onChange={(e) => setQ(e.target.value)}
						placeholder="Search recipes…"
						className="pl-9"
						disabled={!!tag}
					/>
				</div>

				{tag && (
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground">Tag:</span>
						<Badge variant="secondary" className="gap-1">
							#{tag}
							<button
								type="button"
								onClick={clearTag}
								className="ml-1 rounded-sm hover:bg-muted-foreground/20"
								aria-label="Clear tag filter"
							>
								<X className="size-3" />
							</button>
						</Badge>
					</div>
				)}
			</div>

			{filtered.length === 0 ? (
				<EmptyState hasFilter={!!tag || q.length > 0} />
			) : (
				<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filtered.map((r) => (
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

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
	return (
		<div className="rounded-2xl border border-dashed p-12 text-center">
			<p className="text-muted-foreground">
				{hasFilter
					? "No recipes match this filter."
					: "No recipes yet. Add your first one."}
			</p>
			{!hasFilter && (
				<Button asChild className="mt-4">
					<Link to="/recipes/new">
						<Plus className="size-4" />
						New recipe
					</Link>
				</Button>
			)}
		</div>
	);
}
