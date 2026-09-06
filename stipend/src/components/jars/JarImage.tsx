"use client";

import { Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import Image from "@/components/app/AppImage";

interface JarImageProps {
	metadata?: string;
	jarName: string;
}

export function JarImage({ metadata, jarName }: JarImageProps) {
	const [failedUrl, setFailedUrl] = useState<string | null>(null);
	let imageUrl: string | null = null;
	try {
		const parsed = JSON.parse(metadata || "{}");
		if (typeof parsed.image === "string") imageUrl = parsed.image;
	} catch {
		/* Invalid metadata uses the app-owned placeholder. */
	}

	if (!imageUrl || failedUrl === imageUrl) {
		return (
			<div className="w-full h-40 bg-[hsl(var(--cj-warm-white))] flex items-center justify-center relative overflow-hidden m-0">
				<div className="absolute inset-0">
					<Image
						src="/icon.svg"
						alt={`${jarName} image unavailable`}
						fill
						className="object-cover opacity-30"
					/>
				</div>
				<div className="relative z-10 text-center text-[hsl(var(--cj-brand-orange))]">
					<ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-80" />
					<span className="text-sm font-medium">Jar</span>
				</div>
			</div>
		);
	}

	return (
		<div className="relative w-full h-40 bg-[hsl(var(--cj-warm-white))] overflow-hidden m-0">
			<Image
				src={imageUrl}
				alt={jarName}
				fill
				className="object-cover transition-transform duration-200 group-hover:scale-105"
				onError={() => setFailedUrl(imageUrl)}
			/>
		</div>
	);
}
