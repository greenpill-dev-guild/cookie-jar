const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
export function validateJarImage(file: File) {
	if (!IMAGE_TYPES.has(file.type))
		throw new Error("Choose a PNG, JPEG or WebP image.");
	if (file.size === 0 || file.size > 10 * 1024 * 1024)
		throw new Error("Choose an image smaller than 10 MB.");
}

export async function uploadJarImage(
	file: File,
	signal: AbortSignal
): Promise<string> {
	validateJarImage(file);
	const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(120_000)]);
	const endpoint =
		import.meta.env.VITE_UPLOAD_SIGN_URL ||
		"https://agent.greengoods.app/api/uploads/sign";
	const signedResponse = await fetch(endpoint, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		signal: requestSignal,
		body: JSON.stringify({
			filename: file.name,
			mimeType: file.type,
			size: file.size,
			category: "file_upload",
			source: "cookie-jar-image",
		}),
	});
	if (!signedResponse.ok)
		throw new Error("Image uploads are unavailable. Please try again.");
	const signed = await signedResponse.json();
	if (!signed.ok || typeof signed.url !== "string")
		throw new Error("Could not prepare the image upload.");
	const url = new URL(signed.url);
	if (
		url.protocol !== "https:" ||
		url.hostname !== "uploads.pinata.cloud" ||
		url.username ||
		url.password
	)
		throw new Error("The image upload service returned an invalid upload URL.");
	const body = new FormData();
	body.append("network", "public");
	body.append("file", file);
	const response = await fetch(url, {
		method: "POST",
		body,
		signal: requestSignal,
	});
	if (!response.ok) throw new Error("Image upload failed. Please try again.");
	const result = await response.json();
	const cid = result.data?.cid;
	if (
		typeof cid !== "string" ||
		!/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,})$/.test(cid)
	)
		throw new Error("The image upload did not return a valid image reference.");
	return `https://ipfs.io/ipfs/${cid}`;
}
