import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/meal-prep/")({
	beforeLoad: () => {
		throw redirect({ to: "/week" });
	},
});
