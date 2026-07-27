import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import {
	CalendarCheck,
	ChefHat,
	Folder,
	LogOut,
	ShoppingCart,
} from "lucide-react";
import { MealPrepProvider } from "../components/meal-prep/MealPrepProvider.tsx";
import { ThemeToggle } from "../components/shell/ThemeToggle.tsx";
import { UpdatePrompt } from "../components/shell/UpdatePrompt.tsx";
import { getSessionFn } from "../server/auth/getSession.ts";

export const Route = createFileRoute("/_app")({
	beforeLoad: async ({ location }) => {
		const session = await getSessionFn();
		if (!session) {
			throw redirect({
				to: "/login",
				search: { redirect_to: location.pathname },
			});
		}
		return { session };
	},
	component: AppLayout,
});

function AppLayout() {
	return (
		<MealPrepProvider>
			<div className="min-h-dvh bg-background text-foreground pt-[env(safe-area-inset-top)] pb-[calc(4rem+env(safe-area-inset-bottom))] md:pt-0 md:pb-0">
				<TopNav />
				<Outlet />
				<BottomNav />
				<div className="fixed right-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 rounded-full border bg-background/90 shadow-md backdrop-blur md:hidden">
					<ThemeToggle />
				</div>
				<UpdatePrompt />
			</div>
		</MealPrepProvider>
	);
}

const NAV_ITEMS = [
	{ to: "/week", label: "This week", icon: CalendarCheck, exact: true },
	{ to: "/recipes", label: "Recipes", icon: ChefHat, exact: true },
	{ to: "/collections", label: "Collections", icon: Folder, exact: false },
	{ to: "/shopping", label: "Shopping", icon: ShoppingCart, exact: false },
] as const;

function TopNav() {
	return (
		<nav
			className="sticky top-0 z-30 hidden h-12 items-center gap-1 border-b bg-background/80 px-3 backdrop-blur md:flex"
			aria-label="Primary navigation"
		>
			<Link
				to="/week"
				className="mr-auto flex items-center gap-2 px-2 text-sm font-semibold tracking-tight"
			>
				<ChefHat className="size-4" />
				Recipes
			</Link>
			{NAV_ITEMS.map((item) => (
				<Link
					key={item.to}
					to={item.to}
					activeOptions={item.exact ? { exact: true } : undefined}
					className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground data-[status=active]:text-foreground"
				>
					<item.icon className="size-4" />
					{item.label}
				</Link>
			))}
			<ThemeToggle />
			<LogoutButton />
		</nav>
	);
}

function LogoutButton() {
	const router = useRouter();
	async function handleLogout() {
		await fetch("/api/auth/logout", {
			method: "POST",
			credentials: "same-origin",
		});
		await router.invalidate();
		await router.navigate({ to: "/login", search: {} });
	}
	return (
		<button
			type="button"
			onClick={handleLogout}
			className="ml-1 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
			aria-label="Sign out"
		>
			<LogOut className="size-4" />
		</button>
	);
}

function BottomNav() {
	return (
		<nav
			className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
			aria-label="Primary navigation"
		>
			{NAV_ITEMS.map((item) => (
				<Link
					key={item.to}
					to={item.to}
					activeOptions={item.exact ? { exact: true } : undefined}
					onClick={
						item.to === "/recipes"
							? () => window.scrollTo({ top: 0, behavior: "smooth" })
							: undefined
					}
					className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground data-[status=active]:text-foreground"
				>
					<item.icon className="size-5" />
					{item.label}
				</Link>
			))}
		</nav>
	);
}
