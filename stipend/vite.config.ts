import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type PreviewServer, type ViteDevServer } from "vite";
import { getDeploymentInfo } from "../shared/src/config/deployments.auto";
import { parseStipendEnv } from "./src/config/environment";
import deployment from "./vercel.json";

// Mirror Vercel's public image aliases in local dev and built previews.
function imageAliases(server: ViteDevServer | PreviewServer) {
	const aliases: Record<string, string> = {
		"/opengraph-image": "/opengraph-image.png",
		"/icon": "/icon.svg",
		"/apple-icon": "/apple-icon.png",
	};
	server.middlewares.use((request, _response, next) => {
		const [path, query] = (request.url || "/").split("?");
		if (aliases[path]) request.url = aliases[path] + (query ? `?${query}` : "");
		next();
	});
}

export default defineConfig(() => {
	const config = parseStipendEnv(process.env);
	return {
		envDir: false,
		plugins: [
			react(),
			{
				name: "stipend-image-aliases",
				configureServer: imageAliases,
				configurePreviewServer: imageAliases,
			},
			{
				name: "stipend-local-registry",
				configureServer(server) {
					if (config.chainId !== 31337) return;
					// The existing local deployment flow writes this public JSON in client/.
					server.middlewares.use(
						"/contracts/local-deployment.json",
						async (_request, response) => {
							const contents = await readFile(
								new URL(
									"../client/public/contracts/local-deployment.json",
									import.meta.url
								),
								"utf8"
							).catch(() =>
								JSON.stringify({
									CookieJarFactory: getDeploymentInfo(31337)?.factoryAddress,
									timestamp: 0,
								})
							);
							response.setHeader("Content-Type", "application/json");
							response.end(contents);
						}
					);
				},
			},
			{
				name: "stipend-metadata",
				transformIndexHtml(html: string) {
					return html.replaceAll("%SITE_URL%", config.siteUrl);
				},
			},
		],
		resolve: {
			alias: {
				"@": fileURLToPath(new URL("./src", import.meta.url)),
				"@jar-core": fileURLToPath(new URL("../shared/src", import.meta.url)),
			},
			dedupe: ["react", "react-dom", "wagmi", "@tanstack/react-query"],
		},
		server: {
			host: "127.0.0.1",
			port: 3041,
			headers: Object.fromEntries(
				deployment.headers[0].headers.map(({ key, value }) => [key, value])
			),
		},
		preview: {
			headers: Object.fromEntries(
				deployment.headers[0].headers.map(({ key, value }) => [key, value])
			),
		},
		build: { outDir: "dist" },
	};
});
