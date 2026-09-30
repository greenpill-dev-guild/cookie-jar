import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(process.cwd(), "..");

describe("stipend Vercel deployment", () => {
	it("builds the Vite app from the repository workspace root", () => {
		const config = JSON.parse(
			readFileSync(`${repositoryRoot}/vercel.json`, "utf8")
		);
		const packageJson = JSON.parse(
			readFileSync(`${repositoryRoot}/package.json`, "utf8")
		);

		expect(existsSync(`${repositoryRoot}/bun.lock`)).toBe(true);
		expect(existsSync(`${repositoryRoot}/stipend/vercel.json`)).toBe(false);
		expect(config.framework).toBe("vite");
		expect(config.installCommand).toBe(
			"bun install --frozen-lockfile --ignore-scripts"
		);
		expect(config.buildCommand).toBe("bun run build:stipend");
		expect(packageJson.scripts["build:stipend"]).toBe(
			"bun run --cwd stipend build"
		);
		expect(config.outputDirectory).toBe("stipend/dist");
	});
});
