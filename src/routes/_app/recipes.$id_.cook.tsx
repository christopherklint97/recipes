import {
	createFileRoute,
	Link,
	notFound,
	useNavigate,
} from "@tanstack/react-router";
import {
	ChevronLeft,
	ChevronRight,
	Minus,
	Pause,
	Play,
	Plus,
	Timer,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/button.tsx";
import { formatQuantity, formatSeconds } from "../../lib/format.ts";
import { useWakeLock } from "../../lib/wakelock.ts";
import { getRecipeFn } from "../../server/functions/recipes.ts";

export const Route = createFileRoute("/_app/recipes/$id_/cook")({
	loader: async ({ params }) => {
		const r = await getRecipeFn({ data: { id: params.id } });
		if (!r) throw notFound();
		return r;
	},
	component: CookPage,
});

function CookPage() {
	const recipe = Route.useLoaderData();
	const navigate = useNavigate();
	const [stepIndex, setStepIndex] = useState(0);
	const [servings, setServings] = useState(recipe.servings);
	useWakeLock(true);

	const baseServings = Math.max(1, recipe.servings);
	const scale = servings / baseServings;
	const totalSteps = recipe.instructions.length;

	function next() {
		setStepIndex((i) => Math.min(i + 1, Math.max(0, totalSteps - 1)));
	}
	function prev() {
		setStepIndex((i) => Math.max(0, i - 1));
	}

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === "ArrowRight") {
				setStepIndex((i) => Math.min(i + 1, Math.max(0, totalSteps - 1)));
			} else if (e.key === "ArrowLeft") {
				setStepIndex((i) => Math.max(0, i - 1));
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [totalSteps]);

	const step = recipe.instructions[stepIndex];

	function exitCook() {
		void navigate({
			to: "/recipes/$id",
			params: { id: recipe.id },
		});
	}

	return (
		<div className="fixed inset-0 z-50 flex flex-col bg-background">
			<header className="flex items-center justify-between border-b px-4 py-3">
				<div className="min-w-0">
					<p className="truncate text-sm text-muted-foreground">
						{stepIndex + 1} / {Math.max(1, totalSteps)}
					</p>
					<h1 className="truncate text-lg font-semibold">{recipe.title}</h1>
				</div>
				<Button variant="ghost" size="icon" onClick={exitCook}>
					<X className="size-5" />
				</Button>
			</header>

			<div className="grid flex-1 overflow-hidden md:grid-cols-[320px_1fr]">
				<aside className="overflow-auto border-b p-4 md:border-b-0 md:border-r">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-sm font-semibold uppercase text-muted-foreground">
							Ingredients
						</h2>
						<div className="flex items-center gap-1 rounded-md border">
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7"
								onClick={() => setServings((s) => Math.max(1, s - 1))}
							>
								<Minus className="size-3.5" />
							</Button>
							<span className="min-w-8 text-center text-sm tabular-nums">
								{servings}
							</span>
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7"
								onClick={() => setServings((s) => Math.min(50, s + 1))}
							>
								<Plus className="size-3.5" />
							</Button>
						</div>
					</div>
					{recipe.ingredients.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No ingredients listed.
						</p>
					) : (
						<ul className="space-y-2 text-sm">
							{recipe.ingredients.map((ing) => (
								<li key={ing.id} className="flex gap-2">
									{ing.quantity != null && (
										<span className="font-medium tabular-nums">
											{formatQuantity(ing.quantity * scale)}
										</span>
									)}
									{ing.unit && (
										<span className="text-muted-foreground">{ing.unit}</span>
									)}
									<span>{ing.name}</span>
									{ing.note && (
										<span className="text-muted-foreground">({ing.note})</span>
									)}
								</li>
							))}
						</ul>
					)}
				</aside>

				<main className="flex flex-1 flex-col overflow-hidden">
					<div className="flex flex-1 items-center justify-center overflow-auto p-6 sm:p-12">
						{step ? (
							<div className="max-w-2xl space-y-8">
								<div className="flex items-baseline gap-3">
									<span className="flex size-10 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground">
										{stepIndex + 1}
									</span>
									<p className="text-2xl leading-relaxed sm:text-3xl">
										{step.text}
									</p>
								</div>
								{step.durationSeconds != null && step.durationSeconds > 0 && (
									<StepTimer durationSeconds={step.durationSeconds} />
								)}
							</div>
						) : (
							<div className="text-center text-muted-foreground">
								<p className="text-lg">No steps for this recipe.</p>
								<Button asChild variant="outline" className="mt-4">
									<Link to="/recipes/$id/edit" params={{ id: recipe.id }}>
										Add some
									</Link>
								</Button>
							</div>
						)}
					</div>

					<footer className="flex items-center justify-between gap-3 border-t p-4">
						<Button
							variant="outline"
							onClick={prev}
							disabled={stepIndex === 0}
							size="lg"
						>
							<ChevronLeft className="size-5" />
							Back
						</Button>
						<Progress index={stepIndex} total={totalSteps} />
						<Button
							onClick={next}
							disabled={stepIndex >= totalSteps - 1 || totalSteps === 0}
							size="lg"
						>
							Next
							<ChevronRight className="size-5" />
						</Button>
					</footer>
				</main>
			</div>
		</div>
	);
}

function Progress({ index, total }: { index: number; total: number }) {
	const pct = total === 0 ? 0 : ((index + 1) / total) * 100;
	return (
		<div className="mx-2 h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
			<div
				className="h-full bg-primary transition-all"
				style={{ width: `${pct}%` }}
			/>
		</div>
	);
}

function StepTimer({ durationSeconds }: { durationSeconds: number }) {
	const [remaining, setRemaining] = useState(durationSeconds);
	const [running, setRunning] = useState(false);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		if (!running) return;
		intervalRef.current = setInterval(() => {
			setRemaining((r) => {
				if (r <= 1) {
					setRunning(false);
					try {
						navigator.vibrate?.([200, 100, 200]);
					} catch {
						// ignore
					}
					return 0;
				}
				return r - 1;
			});
		}, 1000);
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [running]);

	useEffect(() => {
		setRemaining(durationSeconds);
		setRunning(false);
	}, [durationSeconds]);

	return (
		<div className="inline-flex items-center gap-3 rounded-full border bg-card px-4 py-2">
			<Timer className="size-5 text-muted-foreground" />
			<span className="text-2xl font-semibold tabular-nums">
				{formatSeconds(remaining)}
			</span>
			<Button
				variant="outline"
				size="sm"
				onClick={() => setRunning((r) => !r)}
				disabled={remaining === 0}
			>
				{running ? <Pause className="size-4" /> : <Play className="size-4" />}
				{running ? "Pause" : remaining === durationSeconds ? "Start" : "Resume"}
			</Button>
			{remaining !== durationSeconds && (
				<Button
					variant="ghost"
					size="sm"
					onClick={() => {
						setRemaining(durationSeconds);
						setRunning(false);
					}}
				>
					Reset
				</Button>
			)}
		</div>
	);
}
