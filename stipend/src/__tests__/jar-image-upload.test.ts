import { afterEach, expect, it, vi } from "vitest";
import { uploadJarImage } from "@/lib/jar-image-upload";

afterEach(() => vi.unstubAllGlobals());
it("uploads through a signed URL and saves a durable image reference", async () => {
	const fetch = vi
		.fn()
		.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					ok: true,
					url: "https://uploads.pinata.cloud/v3/files?signature=test",
				})
			)
		)
		.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					data: {
						cid: "bafkreiciqpf375f4jtrwtacn2mqrjqlf5upjvbyaclx7zvevajurkprsoy",
					},
				})
			)
		);
	vi.stubGlobal("fetch", fetch);
	const result = await uploadJarImage(
		new File(["png"], "photo.png", { type: "image/png" }),
		new AbortController().signal
	);
	expect(result).toBe(
		"https://ipfs.io/ipfs/bafkreiciqpf375f4jtrwtacn2mqrjqlf5upjvbyaclx7zvevajurkprsoy"
	);
	expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
		mimeType: "image/png",
		size: 3,
		source: "cookie-jar-image",
	});
	expect(fetch.mock.calls[1][1].body).toBeInstanceOf(FormData);
	expect(fetch.mock.calls[1][1].body.get("network")).toBe("public");
});
it.each([
	new File(["text"], "file.svg", { type: "image/svg+xml" }),
	new File([], "empty.png", { type: "image/png" }),
])("rejects invalid files before network access", async (file) => {
	const fetch = vi.fn();
	vi.stubGlobal("fetch", fetch);
	await expect(
		uploadJarImage(file, new AbortController().signal)
	).rejects.toThrow();
	expect(fetch).not.toHaveBeenCalled();
});
it("does not upload a file to an unexpected signed host", async () => {
	const fetch = vi
		.fn()
		.mockResolvedValue(
			new Response(
				JSON.stringify({ ok: true, url: "https://untrusted.test/upload" })
			)
		);
	vi.stubGlobal("fetch", fetch);
	await expect(
		uploadJarImage(
			new File(["png"], "photo.png", { type: "image/png" }),
			new AbortController().signal
		)
	).rejects.toThrow("invalid upload URL");
	expect(fetch).toHaveBeenCalledTimes(1);
});
