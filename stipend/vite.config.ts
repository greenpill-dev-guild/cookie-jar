import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { parseStipendEnv } from "./src/config/environment";
import deployment from "./vercel.json";
export default defineConfig(() => {
	const config = parseStipendEnv(process.env);
	return {
		envDir: false,
		plugins: [
			react(),
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
