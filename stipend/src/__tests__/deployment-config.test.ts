import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(process.cwd(), "..");

describe("stipend Vercel deployment", () => {
	it("installs the workspace and builds from the stipend project root", () => {
		const config = JSON.parse(
			readFileSync(`${repositoryRoot}/stipend/vercel.json`, "utf8")
		);
		const packageJson = JSON.parse(
			readFileSync(`${repositoryRoot}/package.json`, "utf8")
		);

		expect(existsSync(`${repositoryRoot}/bun.lock`)).toBe(true);
		expect(existsSync(`${repositoryRoot}/shared/package.json`)).toBe(true);
		expect(config.framework).toBe("vite");
		expect(config.installCommand).toBe(
			"bun install --cwd .. --frozen-lockfile --ignore-scripts"
		);
		expect(config.buildCommand).toBe("bun run build");
		expect(packageJson.scripts["build:stipend"]).toBe(
			"bun run --cwd stipend build"
		);
		expect(config.outputDirectory).toBe("dist");
	});
});
