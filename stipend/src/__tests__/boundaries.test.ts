import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";
const root = resolve(process.cwd(), "..");
function sources(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
		entry.isDirectory()
			? sources(join(dir, entry.name))
			: /\.(ts|tsx)$/.test(entry.name)
				? [join(dir, entry.name)]
				: []
	);
}
it("keeps the Vite UI and shared transaction core independent of Next", () => {
	for (const folder of ["stipend/src", "shared/src"]) {
		for (const file of sources(join(root, folder))) {
			if (file.includes("/__tests__/")) continue;
			const code = readFileSync(file, "utf8");
			expect(code, file).not.toMatch(/(?:from|import)\s*[(]?\s*["']next\//);
			expect(code, file).not.toMatch(
				/(?:from|import)\s*[(]?\s*["'][^"']*client\/(?:app|components|hooks)/
			);
		}
	}
});
it("allows only generated contract data to cross from the canonical registry", () => {
	for (const file of sources(join(root, "shared/src"))) {
		const code = readFileSync(file, "utf8");
		if (/from\s+["'][^"']*client\//.test(code))
			expect(file).toMatch(/(?:generated|deployments\.auto)\.ts$/);
	}
	const generic = readFileSync(
		join(root, "client/config/featured-jar.ts"),
		"utf8"
	);
	expect(generic).toContain('SITE_NAME = "Cookie Jar"');
	expect(
		readFileSync(
			join(root, "client/components/create/CreationSetup.tsx"),
			"utf8"
		)
	).not.toContain("stipend preset");
});
