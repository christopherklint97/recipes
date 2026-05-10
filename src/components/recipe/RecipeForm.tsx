import { useForm } from "@tanstack/react-form";
import { Trash2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { z } from "zod";
import type { RecipeInput } from "../../server/functions/recipes.ts";
import { Badge } from "../ui/badge.tsx";
import { Button } from "../ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.tsx";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import { Textarea } from "../ui/textarea.tsx";

const formSchema = z.object({
	title: z.string().min(1, "Title is required").max(200),
	description: z.string().optional(),
	heroImage: z.string().optional(),
	servings: z.number().int().min(1).max(100),
	prepMinutes: z.number().int().min(0).optional(),
	cookMinutes: z.number().int().min(0).optional(),
	caloriesPerServing: z.number().int().min(0).optional(),
	costEstimateCents: z.number().int().min(0).optional(),
	notes: z.string().optional(),
	sourceUrl: z.string().url().optional().or(z.literal("")),
	ingredients: z.array(
		z.object({
			name: z.string().min(1),
			quantity: z.number().nullable().optional(),
			unit: z.string().optional(),
			note: z.string().optional(),
			groupName: z.string().optional(),
		}),
	),
	instructions: z.array(
		z.object({
			text: z.string().min(1),
			durationSeconds: z.number().int().min(0).nullable().optional(),
		}),
	),
	tagNames: z.array(z.string()),
});

export type RecipeFormValues = z.infer<typeof formSchema>;

const emptyValues: RecipeFormValues = {
	title: "",
	description: "",
	heroImage: "",
	servings: 2,
	prepMinutes: undefined,
	cookMinutes: undefined,
	caloriesPerServing: undefined,
	costEstimateCents: undefined,
	notes: "",
	sourceUrl: "",
	ingredients: [],
	instructions: [],
	tagNames: [],
};

export function toRecipeInput(
	values: RecipeFormValues,
): Omit<RecipeInput, "sourceType" | "rawImport"> {
	return {
		title: values.title.trim(),
		description: values.description?.trim() || null,
		heroImage: values.heroImage?.trim() || null,
		sourceUrl: values.sourceUrl?.trim() || null,
		servings: values.servings,
		prepMinutes: values.prepMinutes ?? null,
		cookMinutes: values.cookMinutes ?? null,
		caloriesPerServing: values.caloriesPerServing ?? null,
		costEstimateCents: values.costEstimateCents ?? null,
		notes: values.notes?.trim() || null,
		ingredients: values.ingredients.map((row, position) => ({
			position,
			name: row.name.trim(),
			quantity: row.quantity ?? null,
			unit: row.unit?.trim() || null,
			note: row.note?.trim() || null,
			groupName: row.groupName?.trim() || null,
		})),
		instructions: values.instructions.map((row, position) => ({
			position,
			text: row.text.trim(),
			durationSeconds: row.durationSeconds ?? null,
		})),
		tagNames: values.tagNames,
	};
}

interface RecipeFormProps {
	defaultValues?: Partial<RecipeFormValues>;
	submitLabel: string;
	onSubmit: (values: RecipeFormValues) => Promise<void> | void;
}

export function RecipeForm({
	defaultValues,
	submitLabel,
	onSubmit,
}: RecipeFormProps) {
	const form = useForm({
		defaultValues: { ...emptyValues, ...defaultValues } as RecipeFormValues,
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => onSubmit(value),
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			className="space-y-8"
		>
			<Card>
				<CardHeader>
					<CardTitle>Basics</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<form.Field name="title">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Title</Label>
								<Input
									id={field.name}
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									required
								/>
								<FieldError field={field} />
							</div>
						)}
					</form.Field>

					<form.Field name="description">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Description</Label>
								<Textarea
									id={field.name}
									name={field.name}
									value={field.state.value ?? ""}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									rows={3}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="heroImage">
						{(field) => (
							<HeroImagePicker
								value={field.state.value ?? ""}
								onChange={(v) => field.handleChange(v)}
							/>
						)}
					</form.Field>

					<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
						<form.Field name="servings">
							{(field) => (
								<NumberInput
									label="Servings"
									name={field.name}
									min={1}
									value={field.state.value}
									onChange={(v) => field.handleChange(v ?? 1)}
								/>
							)}
						</form.Field>
						<form.Field name="prepMinutes">
							{(field) => (
								<NumberInput
									label="Prep (min)"
									name={field.name}
									min={0}
									value={field.state.value}
									onChange={(v) => field.handleChange(v)}
								/>
							)}
						</form.Field>
						<form.Field name="cookMinutes">
							{(field) => (
								<NumberInput
									label="Cook (min)"
									name={field.name}
									min={0}
									value={field.state.value}
									onChange={(v) => field.handleChange(v)}
								/>
							)}
						</form.Field>
						<form.Field name="caloriesPerServing">
							{(field) => (
								<NumberInput
									label="Calories / serving"
									name={field.name}
									min={0}
									value={field.state.value}
									onChange={(v) => field.handleChange(v)}
								/>
							)}
						</form.Field>
					</div>

					<form.Field name="sourceUrl">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Source URL</Label>
								<Input
									id={field.name}
									name={field.name}
									type="url"
									placeholder="https://"
									value={field.state.value ?? ""}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
								<FieldError field={field} />
							</div>
						)}
					</form.Field>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Tags</CardTitle>
				</CardHeader>
				<CardContent>
					<form.Field name="tagNames" mode="array">
						{(field) => (
							<TagInput
								value={field.state.value}
								onChange={(next) => field.setValue(() => next)}
							/>
						)}
					</form.Field>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Ingredients</CardTitle>
				</CardHeader>
				<CardContent>
					<form.Field name="ingredients" mode="array">
						{(field) => (
							<div className="space-y-3">
								{field.state.value.map((_, index) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: ingredient rows reorder by index
									<div key={index} className="grid grid-cols-12 gap-2">
										<form.Field name={`ingredients[${index}].quantity`}>
											{(sub) => (
												<Input
													className="col-span-2"
													inputMode="decimal"
													placeholder="Qty"
													value={sub.state.value ?? ""}
													onChange={(e) => {
														const v = e.target.value;
														sub.handleChange(v === "" ? null : Number(v));
													}}
												/>
											)}
										</form.Field>
										<form.Field name={`ingredients[${index}].unit`}>
											{(sub) => (
												<Input
													className="col-span-2"
													placeholder="Unit"
													value={sub.state.value ?? ""}
													onChange={(e) => sub.handleChange(e.target.value)}
												/>
											)}
										</form.Field>
										<form.Field name={`ingredients[${index}].name`}>
											{(sub) => (
												<Input
													className="col-span-7"
													placeholder="Ingredient"
													value={sub.state.value}
													onChange={(e) => sub.handleChange(e.target.value)}
												/>
											)}
										</form.Field>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="col-span-1"
											onClick={() => field.removeValue(index)}
										>
											<Trash2 className="size-4" />
										</Button>
									</div>
								))}
								<Button
									type="button"
									variant="outline"
									onClick={() =>
										field.pushValue({
											name: "",
											quantity: null,
											unit: "",
											note: "",
											groupName: "",
										})
									}
								>
									Add ingredient
								</Button>
							</div>
						)}
					</form.Field>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Instructions</CardTitle>
				</CardHeader>
				<CardContent>
					<form.Field name="instructions" mode="array">
						{(field) => (
							<div className="space-y-3">
								{field.state.value.map((_, index) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: instruction rows reorder by index
									<div key={index} className="space-y-2">
										<div className="flex items-start gap-2">
											<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-medium text-muted-foreground">
												{index + 1}
											</div>
											<form.Field name={`instructions[${index}].text`}>
												{(sub) => (
													<Textarea
														className="flex-1"
														placeholder={`Step ${index + 1}`}
														rows={2}
														value={sub.state.value}
														onChange={(e) => sub.handleChange(e.target.value)}
													/>
												)}
											</form.Field>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												onClick={() => field.removeValue(index)}
											>
												<Trash2 className="size-4" />
											</Button>
										</div>
										<form.Field name={`instructions[${index}].durationSeconds`}>
											{(sub) => (
												<div className="flex items-center gap-2 pl-12">
													<Label className="text-xs uppercase text-muted-foreground">
														Timer
													</Label>
													<Input
														type="number"
														inputMode="numeric"
														min={0}
														placeholder="Minutes"
														className="w-24"
														value={
															sub.state.value != null
																? Math.round(sub.state.value / 60)
																: ""
														}
														onChange={(e) => {
															const v = e.target.value;
															sub.handleChange(
																v === "" ? null : Number(v) * 60,
															);
														}}
													/>
													<span className="text-xs text-muted-foreground">
														min · optional
													</span>
												</div>
											)}
										</form.Field>
									</div>
								))}
								<Button
									type="button"
									variant="outline"
									onClick={() =>
										field.pushValue({ text: "", durationSeconds: null })
									}
								>
									Add step
								</Button>
							</div>
						)}
					</form.Field>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Notes</CardTitle>
				</CardHeader>
				<CardContent>
					<form.Field name="notes">
						{(field) => (
							<Textarea
								rows={4}
								value={field.state.value ?? ""}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						)}
					</form.Field>
				</CardContent>
			</Card>

			<form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
				{([canSubmit, isSubmitting]) => (
					<div className="flex justify-end">
						<Button type="submit" disabled={!canSubmit || isSubmitting}>
							{isSubmitting ? "Saving…" : submitLabel}
						</Button>
					</div>
				)}
			</form.Subscribe>
		</form>
	);
}

function FieldError({
	field,
}: {
	field: { state: { meta: { errors: unknown[] } } };
}) {
	const errors = field.state.meta.errors;
	if (!errors?.length) return null;
	return (
		<p className="text-sm text-destructive">
			{errors
				.map((e) =>
					typeof e === "string" ? e : (e as { message?: string })?.message,
				)
				.filter(Boolean)
				.join(", ")}
		</p>
	);
}

function NumberInput({
	label,
	name,
	value,
	onChange,
	min,
	step,
}: {
	label: string;
	name: string;
	value: number | undefined;
	onChange: (v: number | undefined) => void;
	min?: number;
	step?: number;
}) {
	return (
		<div className="space-y-2">
			<Label htmlFor={name}>{label}</Label>
			<Input
				id={name}
				name={name}
				type="number"
				inputMode="numeric"
				min={min}
				step={step ?? 1}
				value={value ?? ""}
				onChange={(e) => {
					const v = e.target.value;
					onChange(v === "" ? undefined : Number(v));
				}}
			/>
		</div>
	);
}

function HeroImagePicker({
	value,
	onChange,
}: {
	value: string;
	onChange: (v: string) => void;
}) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function upload(file: File) {
		setError(null);
		setUploading(true);
		try {
			const fd = new FormData();
			fd.set("file", file);
			const res = await fetch("/api/upload/image", {
				method: "POST",
				body: fd,
			});
			if (!res.ok) {
				const body = (await res.json().catch(() => null)) as {
					error?: string;
				} | null;
				throw new Error(body?.error ?? `upload failed (${res.status})`);
			}
			const data = (await res.json()) as { path: string };
			onChange(data.path);
		} catch (e) {
			setError(e instanceof Error ? e.message : "upload failed");
		} finally {
			setUploading(false);
		}
	}

	return (
		<div className="space-y-2">
			<Label>Hero image</Label>
			<div className="flex items-center gap-4">
				<div className="size-24 shrink-0 overflow-hidden rounded-md border bg-muted">
					{value ? (
						<img src={value} alt="" className="size-full object-cover" />
					) : null}
				</div>
				<div className="flex-1 space-y-2">
					<Input
						ref={inputRef}
						type="file"
						accept="image/jpeg,image/png,image/webp"
						className="hidden"
						onChange={(e) => {
							const f = e.target.files?.[0];
							if (f) void upload(f);
						}}
					/>
					<Button
						type="button"
						variant="outline"
						onClick={() => inputRef.current?.click()}
						disabled={uploading}
					>
						<Upload className="size-4" />
						{uploading ? "Uploading…" : value ? "Replace" : "Upload"}
					</Button>
					{value && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => onChange("")}
						>
							Remove
						</Button>
					)}
					{error && <p className="text-sm text-destructive">{error}</p>}
				</div>
			</div>
		</div>
	);
}

function TagInput({
	value,
	onChange,
}: {
	value: string[];
	onChange: (next: string[]) => void;
}) {
	const [draft, setDraft] = useState("");

	function addTag(raw: string) {
		const t = raw.trim().toLowerCase();
		if (!t) return;
		if (value.includes(t)) {
			setDraft("");
			return;
		}
		onChange([...value, t]);
		setDraft("");
	}

	function removeTag(t: string) {
		onChange(value.filter((x) => x !== t));
	}

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap gap-2">
				{value.map((t) => (
					<Badge key={t} variant="secondary" className="gap-1">
						{t}
						<button
							type="button"
							className="ml-1 rounded-sm hover:bg-muted-foreground/20"
							onClick={() => removeTag(t)}
							aria-label={`Remove tag ${t}`}
						>
							<X className="size-3" />
						</button>
					</Badge>
				))}
			</div>
			<Input
				placeholder="Add tag (press Enter or comma)"
				value={draft}
				onChange={(e) => {
					const v = e.target.value;
					if (v.endsWith(",")) {
						addTag(v.slice(0, -1));
					} else {
						setDraft(v);
					}
				}}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						addTag(draft);
					} else if (
						e.key === "Backspace" &&
						draft === "" &&
						value.length > 0
					) {
						removeTag(value[value.length - 1]);
					}
				}}
			/>
		</div>
	);
}
