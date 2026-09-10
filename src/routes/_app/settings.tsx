import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	getRouteApi,
	useRouter,
} from "@tanstack/react-router";
import { CalendarRange } from "lucide-react";
import { useEffect, useState } from "react";
import { invalidateWeekStartQueries } from "../../components/settings/invalidateWeekStartQueries.ts";
import { WeekStartSetting } from "../../components/settings/WeekStartSetting.tsx";
import type { WeekStartsOn } from "../../lib/week.ts";
import { updateAppSettingsFn } from "../../server/functions/settings.ts";

const appRoute = getRouteApi("/_app");

export const Route = createFileRoute("/_app/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	const { weekStartsOn: savedWeekStart } = appRoute.useLoaderData();
	const [weekStartsOn, setWeekStartsOn] = useState(savedWeekStart);
	const router = useRouter();
	const queryClient = useQueryClient();

	useEffect(() => setWeekStartsOn(savedWeekStart), [savedWeekStart]);

	const update = useMutation({
		mutationFn: (next: WeekStartsOn) =>
			updateAppSettingsFn({ data: { weekStartsOn: next } }),
		onMutate: (next) => {
			const previous = weekStartsOn;
			setWeekStartsOn(next);
			return { previous };
		},
		onError: (_error, _next, context) => {
			if (context?.previous) setWeekStartsOn(context.previous);
		},
		onSuccess: () =>
			invalidateWeekStartQueries(queryClient, () => router.invalidate()),
	});

	return (
		<div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-5">
			<header>
				<p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
					Preferences
				</p>
				<h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Choose how the recipes app organizes your weekly plans.
				</p>
			</header>

			<section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
				<div className="flex items-start gap-3">
					<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
						<CalendarRange className="size-5" />
					</div>
					<div className="min-w-0 flex-1 space-y-4">
						<div>
							<h2 className="font-semibold">Calendar</h2>
							<p className="text-sm text-muted-foreground">
								Changing this keeps existing plans in the same relative week.
							</p>
						</div>
						<WeekStartSetting
							value={weekStartsOn}
							saving={update.isPending}
							onChange={(next) => update.mutate(next)}
						/>
						<p className="min-h-5 text-sm" aria-live="polite">
							{update.isPending && (
								<span className="text-muted-foreground">Saving…</span>
							)}
							{update.isSuccess && !update.isPending && (
								<span className="text-primary">Saved</span>
							)}
							{update.isError && (
								<span className="text-destructive">
									Could not save the setting. Please try again.
								</span>
							)}
						</p>
					</div>
				</div>
			</section>
		</div>
	);
}
