import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
			"@jar-core": fileURLToPath(new URL("../shared/src", import.meta.url)),
		},
	},
	test: {
		environment: "happy-dom",
		globals: true,
		include: ["src/**/*.test.{ts,tsx}"],
	},
});
