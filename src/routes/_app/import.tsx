import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ImageIcon, LinkIcon, Share2 } from "lucide-react";
import { useState } from "react";
import { CollectionSelector } from "../../components/recipe/CollectionSelector.tsx";
import {
	RecipeForm,
	type RecipeFormValues,
	toRecipeInput,
} from "../../components/recipe/RecipeForm.tsx";
import { Button } from "../../components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../components/ui/card.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Label } from "../../components/ui/label.tsx";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "../../components/ui/tabs.tsx";
import { Textarea } from "../../components/ui/textarea.tsx";
import { parsePhotoRecipeText } from "../../lib/photo-recipe.ts";
import {
	importFromSocialFn,
	importFromUrlFn,
} from "../../server/functions/import.ts";
import { createRecipeFn } from "../../server/functions/recipes.ts";

export const Route = createFileRoute("/_app/import")({
	component: ImportPage,
});

function ImportPage() {
	return (
		<div className="mx-auto max-w-3xl space-y-6 p-6">
			<header>
				<h1 className="text-3xl font-semibold tracking-tight">Import</h1>
				<p className="text-muted-foreground">
					Pull a recipe from a website, photograph a cookbook page, or save a
					social post.
				</p>
			</header>

			<Tabs defaultValue="url" className="w-full">
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="url">
						<LinkIcon className="size-4" />
						URL
					</TabsTrigger>
					<TabsTrigger value="photo">
						<ImageIcon className="size-4" />
						Photo
					</TabsTrigger>
					<TabsTrigger value="social">
						<Share2 className="size-4" />
						Social
					</TabsTrigger>
				</TabsList>

				<TabsContent value="url" className="mt-6">
					<UrlImport />
				</TabsContent>
				<TabsContent value="photo" className="mt-6">
					<PhotoImport />
				</TabsContent>
				<TabsContent value="social" className="mt-6">
					<SocialImport />
				</TabsContent>
			</Tabs>
		</div>
	);
}

function UrlImport() {
	const router = useRouter();
	const [url, setUrl] = useState("");
	const [collectionIds, setCollectionIds] = useState<string[]>([]);
	const fetchPreview = useMutation({
		mutationFn: (input: string) => importFromUrlFn({ data: { url: input } }),
	});
	const create = useMutation({
		mutationFn: createRecipeFn,
		onSuccess: ({ id }) => {
			void router.navigate({ to: "/recipes/$id", params: { id } });
		},
	});

	const preview = fetchPreview.data?.ok ? fetchPreview.data.recipe : null;

	return (
		<Card>
			<CardHeader>
				<CardTitle>From a URL</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex gap-2">
					<Input
						type="url"
						placeholder="https://www.seriouseats.com/..."
						value={url}
						onChange={(e) => setUrl(e.target.value)}
					/>
					<Button
						onClick={() => fetchPreview.mutate(url)}
						disabled={!url || fetchPreview.isPending}
					>
						{fetchPreview.isPending ? "Fetching…" : "Fetch"}
					</Button>
				</div>

				{fetchPreview.data && !fetchPreview.data.ok && (
					<p className="text-sm text-destructive">{fetchPreview.data.error}</p>
				)}
				{fetchPreview.error && (
					<p className="text-sm text-destructive">
						{(fetchPreview.error as Error).message}
					</p>
				)}

				{preview && (
					<div className="space-y-4 rounded-lg border p-4">
						<div className="flex gap-4">
							{preview.heroImage && (
								<img
									src={preview.heroImage}
									alt=""
									className="h-24 w-32 rounded object-cover"
								/>
							)}
							<div className="flex-1 space-y-1">
								<h3 className="font-medium">{preview.title}</h3>
								{preview.description && (
									<p className="line-clamp-2 text-sm text-muted-foreground">
										{preview.description}
									</p>
								)}
								<p className="text-xs text-muted-foreground">
									{preview.ingredients.length} ingredients ·{" "}
									{preview.instructions.length} steps · {preview.servings}{" "}
									servings
								</p>
							</div>
						</div>
						<div className="space-y-2">
							<p className="text-sm font-medium">Save to collection</p>
							<CollectionSelector
								value={collectionIds}
								onChange={setCollectionIds}
							/>
						</div>
						<Button
							className="w-full"
							onClick={() =>
								create.mutate({
									data: {
										title: preview.title,
										description: preview.description,
										sourceUrl: preview.sourceUrl,
										sourceType: "url",
										heroImage: preview.heroImage,
										servings: preview.servings,
										prepMinutes: preview.prepMinutes,
										cookMinutes: preview.cookMinutes,
										caloriesPerServing: preview.caloriesPerServing,
										costEstimateCents: null,
										notes: null,
										rawImport: null,
										collectionIds,
										ingredients: preview.ingredients,
										instructions: preview.instructions,
									},
								})
							}
							disabled={create.isPending || collectionIds.length === 0}
						>
							{create.isPending ? "Saving…" : "Save recipe"}
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function SocialImport() {
	const router = useRouter();
	const [url, setUrl] = useState("");
	const [collectionIds, setCollectionIds] = useState<string[]>([]);
	const fetchSocial = useMutation({
		mutationFn: (input: string) => importFromSocialFn({ data: { url: input } }),
	});
	const create = useMutation({
		mutationFn: createRecipeFn,
		onSuccess: ({ id }) => {
			void router.navigate({ to: "/recipes/$id/edit", params: { id } });
		},
	});

	const preview = fetchSocial.data?.ok ? fetchSocial.data.social : null;

	return (
		<Card>
			<CardHeader>
				<CardTitle>From Instagram, TikTok, or Facebook</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-sm text-muted-foreground">
					Pulls the post’s caption and thumbnail. You’ll fill in ingredients and
					steps yourself.
				</p>
				<div className="flex gap-2">
					<Input
						type="url"
						placeholder="https://www.instagram.com/p/..."
						value={url}
						onChange={(e) => setUrl(e.target.value)}
					/>
					<Button
						onClick={() => fetchSocial.mutate(url)}
						disabled={!url || fetchSocial.isPending}
					>
						{fetchSocial.isPending ? "Fetching…" : "Fetch"}
					</Button>
				</div>

				{fetchSocial.data && !fetchSocial.data.ok && (
					<p className="text-sm text-destructive">{fetchSocial.data.error}</p>
				)}

				{preview && (
					<div className="space-y-4 rounded-lg border p-4">
						<div className="flex gap-4">
							{preview.heroImage && (
								<img
									src={preview.heroImage}
									alt=""
									className="h-24 w-32 rounded object-cover"
								/>
							)}
							<div className="flex-1 space-y-1">
								<h3 className="font-medium">{preview.title}</h3>
								<p className="text-xs uppercase text-muted-foreground">
									{preview.platform}
								</p>
							</div>
						</div>
						{preview.caption && (
							<Textarea
								className="text-sm"
								rows={6}
								defaultValue={preview.caption}
								readOnly
							/>
						)}
						<div className="space-y-2">
							<p className="text-sm font-medium">Save to collection</p>
							<CollectionSelector
								value={collectionIds}
								onChange={setCollectionIds}
							/>
						</div>
						<Button
							className="w-full"
							onClick={() =>
								create.mutate({
									data: {
										title: preview.title,
										description: null,
										sourceUrl: preview.sourceUrl,
										sourceType: "social",
										heroImage: preview.heroImage,
										servings: 2,
										prepMinutes: null,
										cookMinutes: null,
										caloriesPerServing: null,
										costEstimateCents: null,
										notes: preview.caption,
										rawImport: preview.caption,
										collectionIds,
										ingredients: [],
										instructions: [],
									},
								})
							}
							disabled={create.isPending || collectionIds.length === 0}
						>
							{create.isPending ? "Saving…" : "Save & finish editing"}
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function PhotoImport() {
	const router = useRouter();
	const [progress, setProgress] = useState<string | null>(null);
	const [parsed, setParsed] = useState<ReturnType<
		typeof parsePhotoRecipeText
	> | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function readQrCode(file: File): Promise<string | null> {
		const [{ default: jsQR }, bitmap] = await Promise.all([
			import("jsqr"),
			createImageBitmap(file),
		]);
		const maxSide = 1800;
		const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
		const canvas = document.createElement("canvas");
		canvas.width = Math.round(bitmap.width * scale);
		canvas.height = Math.round(bitmap.height * scale);
		const context = canvas.getContext("2d", { willReadFrequently: true });
		if (!context) return null;
		context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
		bitmap.close();
		const image = context.getImageData(0, 0, canvas.width, canvas.height);
		return jsQR(image.data, image.width, image.height)?.data ?? null;
	}

	async function runOcr(file: File) {
		setError(null);
		setParsed(null);
		setProgress("Checking the photo for a recipe link…");
		try {
			const qrUrl = await readQrCode(file).catch(() => null);
			if (qrUrl && /^https?:\/\//i.test(qrUrl)) {
				setProgress("Found a recipe link. Importing the original recipe…");
				const imported = await importFromUrlFn({ data: { url: qrUrl } });
				if (imported.ok) {
					setParsed({
						title: imported.recipe.title,
						sourceType: "url",
						description: imported.recipe.description,
						sourceUrl: imported.recipe.sourceUrl,
						heroImage: imported.recipe.heroImage,
						servings: imported.recipe.servings,
						prepMinutes: imported.recipe.prepMinutes,
						cookMinutes: imported.recipe.cookMinutes,
						caloriesPerServing: imported.recipe.caloriesPerServing,
						ingredients: imported.recipe.ingredients,
						instructions: imported.recipe.instructions,
						rawText: `Recipe QR code: ${qrUrl}`,
					});
					setProgress(null);
					return;
				}
			}

			setProgress("Loading Swedish OCR engine…");
			const tesseract = await import("tesseract.js");
			const worker = await tesseract.createWorker(
				["swe", "eng"],
				tesseract.OEM.LSTM_ONLY,
				{
					logger: (message) => {
						if (message.status && typeof message.progress === "number") {
							setProgress(
								`${message.status} (${Math.round(message.progress * 100)}%)`,
							);
						}
					},
				},
			);
			try {
				await worker.setParameters({
					tessedit_pageseg_mode: tesseract.PSM.AUTO,
					preserve_interword_spaces: "1",
				});
				const { data } = await worker.recognize(
					file,
					{ rotateAuto: true },
					{ text: true, blocks: true },
				);
				const blockText = data.blocks
					?.map((block) => block.text.trim())
					.filter(Boolean)
					.join("\n");
				setParsed(parsePhotoRecipeText(blockText || data.text));
			} finally {
				await worker.terminate();
			}
			setProgress(null);
		} catch (caught) {
			setError(
				caught instanceof Error ? caught.message : "Photo analysis failed",
			);
			setProgress(null);
		}
	}

	const create = useMutation({
		mutationFn: (values: RecipeFormValues) => {
			if (!parsed) throw new Error("Scan a recipe first");
			return createRecipeFn({
				data: {
					...toRecipeInput(values),
					sourceType: parsed.sourceType,
					rawImport: parsed.rawText,
					collectionIds: values.collectionIds,
				},
			});
		},
		onSuccess: ({ id }) => {
			void router.navigate({ to: "/recipes/$id", params: { id } });
		},
	});

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>From a photograph</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">
						The importer first checks for a QR recipe link, then falls back to
						Swedish and English layout-aware OCR. Extracted content is separated
						into editable fields before anything is saved.
					</p>
					<div className="space-y-2">
						<Label htmlFor="ocr-file">Recipe photograph</Label>
						<Input
							id="ocr-file"
							type="file"
							accept="image/*"
							onChange={(event) => {
								const file = event.target.files?.[0];
								if (file) void runOcr(file);
							}}
						/>
					</div>
					{progress && (
						<p className="text-sm text-muted-foreground">{progress}</p>
					)}
					{error && <p className="text-sm text-destructive">{error}</p>}
					{parsed && (
						<div className="rounded-lg border bg-muted/30 p-4 text-sm">
							<p className="font-medium">Extraction complete</p>
							<p className="text-muted-foreground">
								Found {parsed.ingredients.length} ingredients and{" "}
								{parsed.instructions.length} instruction steps. Review and
								correct the fields below before saving.
							</p>
							<details className="mt-3">
								<summary className="cursor-pointer text-muted-foreground">
									Show source details
								</summary>
								<pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-background p-3 text-xs">
									{parsed.rawText}
								</pre>
							</details>
						</div>
					)}
				</CardContent>
			</Card>

			{parsed && (
				<RecipeForm
					defaultValues={{
						title: parsed.title,
						description: parsed.description ?? "",
						sourceUrl: parsed.sourceUrl ?? "",
						heroImage: parsed.heroImage ?? "",
						servings: parsed.servings,
						prepMinutes: parsed.prepMinutes ?? undefined,
						cookMinutes: parsed.cookMinutes ?? undefined,
						caloriesPerServing: parsed.caloriesPerServing ?? undefined,
						ingredients: parsed.ingredients.map((ingredient) => ({
							...ingredient,
							unit: ingredient.unit ?? "",
							note: ingredient.note ?? "",
						})),
						instructions: parsed.instructions.map((instruction) => ({
							...instruction,
							durationSeconds: instruction.durationSeconds ?? undefined,
						})),
					}}
					requireCollection
					submitLabel={create.isPending ? "Saving…" : "Save recipe"}
					onSubmit={async (values) => {
						await create.mutateAsync(values);
					}}
				/>
			)}
		</div>
	);
}
