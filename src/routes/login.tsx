import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Label } from "../components/ui/label.tsx";

const search = z.object({
	redirect_to: z.string().optional(),
	error: z.string().optional(),
});

export const Route = createFileRoute("/login")({
	validateSearch: search,
	component: LoginPage,
});

function LoginPage() {
	const { redirect_to } = Route.useSearch();
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setPending(true);
		const form = new FormData(e.currentTarget);
		const url = `/api/auth/login${
			redirect_to ? `?redirect_to=${encodeURIComponent(redirect_to)}` : ""
		}`;
		try {
			const res = await fetch(url, {
				method: "POST",
				body: form,
				credentials: "same-origin",
			});
			if (res.ok) {
				await router.invalidate();
				await router.navigate({
					to: redirect_to?.startsWith("/") ? redirect_to : "/",
				});
				return;
			}
			setError("Invalid username or password.");
		} catch {
			setError("Sign in failed.");
		} finally {
			setPending(false);
		}
	}

	return (
		<main className="min-h-dvh flex items-center justify-center bg-background p-6">
			<form
				onSubmit={handleSubmit}
				className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 shadow-sm"
			>
				<header className="space-y-1.5 text-center">
					<h1 className="text-2xl font-semibold tracking-tight">Recipes</h1>
					<p className="text-sm text-muted-foreground">Sign in to continue</p>
				</header>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="username">Username</Label>
						<Input
							id="username"
							name="username"
							autoComplete="username"
							required
							autoFocus
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="password">Password</Label>
						<Input
							id="password"
							name="password"
							type="password"
							autoComplete="current-password"
							required
						/>
					</div>
				</div>

				{error && (
					<p className="text-sm text-destructive" role="alert">
						{error}
					</p>
				)}

				<Button type="submit" className="w-full" disabled={pending}>
					{pending ? "Signing in…" : "Sign in"}
				</Button>
			</form>
		</main>
	);
}
