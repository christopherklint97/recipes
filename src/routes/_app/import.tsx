import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ImageIcon, LinkIcon, Share2 } from "lucide-react";
import { useState } from "react";
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
										ingredients: preview.ingredients,
										instructions: preview.instructions,
									},
								})
							}
							disabled={create.isPending}
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
										ingredients: [],
										instructions: [],
									},
								})
							}
							disabled={create.isPending}
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
	const [text, setText] = useState("");
	const [error, setError] = useState<string | null>(null);

	async function runOcr(file: File) {
		setError(null);
		setText("");
		setProgress("Loading OCR engine…");
		try {
			const tesseract = await import("tesseract.js");
			const { data } = await tesseract.recognize(file, "eng", {
				logger: (m: { status?: string; progress?: number }) => {
					if (m.status && typeof m.progress === "number") {
						setProgress(`${m.status} (${Math.round(m.progress * 100)}%)`);
					}
				},
			});
			setText(data.text.trim());
			setProgress(null);
		} catch (e) {
			setError(e instanceof Error ? e.message : "OCR failed");
			setProgress(null);
		}
	}

	const create = useMutation({
		mutationFn: createRecipeFn,
		onSuccess: ({ id }) => {
			void router.navigate({ to: "/recipes/$id/edit", params: { id } });
		},
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>From a photograph</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-sm text-muted-foreground">
					Photograph a cookbook page or handwritten note. The text will be
					extracted on this device — no upload to a third party.
				</p>
				<div className="space-y-2">
					<Label htmlFor="ocr-file">Photo</Label>
					<Input
						id="ocr-file"
						type="file"
						accept="image/*"
						onChange={(e) => {
							const f = e.target.files?.[0];
							if (f) void runOcr(f);
						}}
					/>
				</div>
				{progress && (
					<p className="text-sm text-muted-foreground">{progress}</p>
				)}
				{error && <p className="text-sm text-destructive">{error}</p>}
				{text && (
					<div className="space-y-3">
						<Textarea
							className="font-mono text-sm"
							rows={10}
							value={text}
							onChange={(e) => setText(e.target.value)}
						/>
						<Button
							className="w-full"
							onClick={() =>
								create.mutate({
									data: {
										title: "Imported from photo",
										description: null,
										sourceUrl: null,
										sourceType: "ocr",
										heroImage: null,
										servings: 2,
										prepMinutes: null,
										cookMinutes: null,
										caloriesPerServing: null,
										costEstimateCents: null,
										notes: text,
										rawImport: text,
										ingredients: [],
										instructions: [],
									},
								})
							}
							disabled={create.isPending}
						>
							{create.isPending ? "Saving…" : "Save & finish editing"}
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
