import type { JarCreationFormData } from "@jar-core/hooks/jar/schemas/jarCreationSchema";
import { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadJarImage, validateJarImage } from "@/lib/jar-image-upload";

export function JarImageInput() {
	const {
		register,
		watch,
		setValue,
		setError,
		clearErrors,
		formState: { errors },
	} = useFormContext<JarCreationFormData>();
	const imageUrl = watch("imageUrl");
	const remotePreview = imageUrl?.startsWith("https://") ? imageUrl : undefined;
	const [file, setFile] = useState<File>();
	const [preview, setPreview] = useState<string>();
	const [uploading, setUploading] = useState(false);
	const request = useRef<AbortController>();
	const input = useRef<HTMLInputElement>(null);
	useEffect(() => {
		if (!file) {
			setPreview(undefined);
			return;
		}
		const url = URL.createObjectURL(file);
		setPreview(encodeURI(url));
		return () => URL.revokeObjectURL(url);
	}, [file]);
	useEffect(
		() => () => {
			request.current?.abort();
		},
		[]
	);
	const upload = async (selected: File) => {
		request.current?.abort();
		const controller = new AbortController();
		request.current = controller;
		try {
			validateJarImage(selected);
			setFile(selected);
			setUploading(true);
			setError("imageUrl", {
				type: "upload",
				message: "Wait for the image upload to finish.",
			});
			const url = await uploadJarImage(selected, controller.signal);
			if (controller.signal.aborted) return;
			setValue("imageUrl", url, { shouldDirty: true });
			clearErrors("imageUrl");
			setFile(undefined);
		} catch (error) {
			if (!controller.signal.aborted)
				setError("imageUrl", {
					type: "upload",
					message: (error as Error).message,
				});
		} finally {
			if (request.current === controller) setUploading(false);
		}
	};
	const remove = () => {
		request.current?.abort();
		setUploading(false);
		setFile(undefined);
		setValue("imageUrl", "", { shouldDirty: true });
		clearErrors("imageUrl");
		if (input.current) input.current.value = "";
	};
	return (
		<div className="space-y-3">
			<Label htmlFor="jar-image">Jar image</Label>
			<Input
				id="jar-image"
				ref={input}
				type="file"
				accept="image/png,image/jpeg,image/webp"
				aria-describedby="jar-image-help jar-image-status"
				aria-invalid={!!errors.imageUrl}
				onChange={(event) => {
					const selected = event.target.files?.[0];
					if (selected) void upload(selected);
					event.target.value = "";
				}}
			/>
			<p id="jar-image-help" className="text-sm text-muted-foreground">
				Upload a PNG, JPEG or WebP image up to 10 MB.
			</p>
			{(preview || remotePreview) && (
				<img
					src={preview || remotePreview}
					alt="Jar image preview"
					className="h-32 w-32 rounded-lg object-cover"
				/>
			)}
			<p
				id="jar-image-status"
				role="status"
				className="text-sm text-muted-foreground"
			>
				{uploading
					? "Uploading image…"
					: errors.imageUrl?.message || (imageUrl ? "Image ready." : "")}
			</p>
			{(file || imageUrl || errors.imageUrl) && (
				<div className="flex gap-2">
					<Button type="button" variant="outline" onClick={remove}>
						{uploading ? "Cancel upload" : "Remove image"}
					</Button>
					{!uploading && file && errors.imageUrl && (
						<Button
							type="button"
							variant="outline"
							onClick={() => void upload(file)}
						>
							Retry upload
						</Button>
					)}
				</div>
			)}
			<details>
				<summary className="cursor-pointer text-sm text-muted-foreground inline-flex min-h-11 items-center">
					Use an image URL
				</summary>
				<Label htmlFor="imageUrl">Image URL</Label>
				<Input
					id="imageUrl"
					placeholder="https://example.com/image.jpg"
					disabled={uploading}
					{...register("imageUrl", {
						onChange: () => {
							request.current?.abort();
							setFile(undefined);
							clearErrors("imageUrl");
						},
					})}
				/>
			</details>
		</div>
	);
}
