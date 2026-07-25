import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Plus } from "lucide-react";
import { useState } from "react";
import { AddToMealPrepDialog } from "../../components/meal-prep/AddToMealPrepDialog.tsx";
import { Button } from "../../components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../components/ui/card.tsx";
import {
	formatWeek,
	formatWeekRange,
	weekStartFromOffset,
} from "../../lib/week.ts";
import { listMealPrepsFn } from "../../server/functions/meal-preps.ts";

export const Route = createFileRoute("/_app/meal-prep/")({
	loader: () => listMealPrepsFn(),
	component: MealPrepIndexPage,
});

function MealPrepIndexPage() {
	const initial = Route.useLoaderData();
	const [createOpen, setCreateOpen] = useState(false);
	const { data: mealPreps = initial } = useQuery({
		queryKey: ["meal-preps"],
		queryFn: () => listMealPrepsFn(),
		initialData: initial,
	});
	const thisWeek = weekStartFromOffset();
	const today = new Intl.DateTimeFormat(undefined, {
		weekday: "long",
		month: "long",
		day: "numeric",
	}).format(new Date());

	return (
		<div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-5">
			<header className="flex items-start justify-between gap-3">
				<div>
					<h1 className="text-3xl font-semibold tracking-tight">Meal prep</h1>
					<p className="text-sm text-muted-foreground">
						{mealPreps.length} saved list{mealPreps.length === 1 ? "" : "s"}
					</p>
				</div>
				<Button onClick={() => setCreateOpen(true)}>
					<Plus className="size-4" />
					New meal prep
				</Button>
			</header>

			<div className="flex items-center gap-3 rounded-2xl border bg-muted/40 p-4">
				<CalendarDays className="size-5 text-primary" />
				<div>
					<p className="font-medium">Today is {today}</p>
					<p className="text-sm text-muted-foreground">
						{formatWeek(thisWeek)} · {formatWeekRange(thisWeek)}
					</p>
				</div>
			</div>

			{mealPreps.length === 0 ? (
				<div className="rounded-2xl border border-dashed p-12 text-center">
					<p className="text-muted-foreground">
						Create a meal prep for this week, next week, or any future week.
					</p>
					<Button className="mt-4" onClick={() => setCreateOpen(true)}>
						<Plus className="size-4" /> New meal prep
					</Button>
				</div>
			) : (
				<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{mealPreps.map((mealPrep) => (
						<li key={mealPrep.id}>
							<Link
								to="/meal-prep/$id"
								params={{ id: mealPrep.id }}
								className="block focus-visible:outline-none"
							>
								<Card className="h-full transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring">
									<CardHeader>
										<CardTitle>{mealPrep.name}</CardTitle>
									</CardHeader>
									<CardContent className="space-y-1">
										<p className="text-sm font-medium">
											{formatWeek(mealPrep.weekStart)}
										</p>
										<p className="text-sm text-muted-foreground">
											{formatWeekRange(mealPrep.weekStart)} ·{" "}
											{mealPrep.plannedItemCount} planned item
											{mealPrep.plannedItemCount === 1 ? "" : "s"}
										</p>
										{mealPrep.weekStart === thisWeek && (
											<p className="pt-2 text-xs font-medium text-primary">
												This week
											</p>
										)}
									</CardContent>
								</Card>
							</Link>
						</li>
					))}
				</ul>
			)}

			<AddToMealPrepDialog open={createOpen} onOpenChange={setCreateOpen} />
		</div>
	);
}
