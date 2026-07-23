import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useId } from "react";
import { listCollectionsFn } from "../../server/functions/collections.ts";
import { Button } from "../ui/button.tsx";
import { Checkbox } from "../ui/checkbox.tsx";

export function CollectionSelector({
	value,
	onChange,
}: {
	value: string[];
	onChange: (value: string[]) => void;
}) {
	const instanceId = useId();
	const { data: collections = [], isLoading } = useQuery({
		queryKey: ["collections"],
		queryFn: () => listCollectionsFn(),
	});

	if (isLoading) {
		return (
			<p className="text-sm text-muted-foreground">Loading collections…</p>
		);
	}
	if (collections.length === 0) {
		return (
			<div className="rounded-lg border border-dashed p-4 text-sm">
				<p className="text-muted-foreground">
					Create a collection before saving a recipe.
				</p>
				<Button asChild variant="outline" size="sm" className="mt-3">
					<Link to="/collections">Go to collections</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="grid gap-2 sm:grid-cols-2">
			{collections.map((collection) => {
				const checked = value.includes(collection.id);
				const inputId = `${instanceId}-${collection.id}`;
				return (
					<label
						key={collection.id}
						htmlFor={inputId}
						className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition ${checked ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
					>
						<Checkbox
							id={inputId}
							checked={checked}
							onCheckedChange={(next) =>
								onChange(
									next === true
										? [...value, collection.id]
										: value.filter((id) => id !== collection.id),
								)
							}
						/>
						<span className="min-w-0 truncate">
							{collection.icon && `${collection.icon} `}
							{collection.name}
						</span>
					</label>
				);
			})}
		</div>
	);
}
