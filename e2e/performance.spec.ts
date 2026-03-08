import { expect, test } from "@playwright/test";

test.describe("⚡ Performance Testing", () => {
	test("Homepage load performance", async ({ page }) => {
		console.log("📊 Testing homepage load performance...");

		// Measure page load times
		const startTime = Date.now();
		await page.goto("/");
		await page.waitForLoadState("networkidle");
		const loadTime = Date.now() - startTime;

		console.log(`📈 Homepage load time: ${loadTime}ms`);

		// Should load within reasonable time
		expect(loadTime).toBeLessThan(5000); // 5 seconds max

		// Check for performance metrics
		const navigationEntries = await page.evaluate(() =>
			performance.getEntriesByType("navigation"),
		);

		if (navigationEntries.length > 0) {
			const entry = navigationEntries[0] as PerformanceNavigationTiming;
			console.log("📊 Performance metrics:", {
				domContentLoaded: Math.round(
					entry.domContentLoadedEventEnd - entry.fetchStart,
				),
				loadComplete: Math.round(entry.loadEventEnd - entry.fetchStart),
				firstPaint: Math.round(
					(entry as any).firstPaint - entry.fetchStart || 0,
				),
			});
		}
	});

	test("Jar list loading performance", async ({ page }) => {
		console.log("📋 Testing jar list performance...");

		await page.goto("/jars");

		// Measure time to render jar cards
		const startTime = Date.now();
		await page.waitForSelector(".cj-card-primary", { timeout: 10000 });
		const renderTime = Date.now() - startTime;

		console.log(`📈 Jar list render time: ${renderTime}ms`);
		expect(renderTime).toBeLessThan(8000); // Should render within 8 seconds

		// Count jar cards
		const jarCards = page.locator(".cj-card-primary");
		const jarCount = await jarCards.count();
		console.log(`📊 Found ${jarCount} jar cards`);

		// Check memory usage if available
		const memoryInfo = await page.evaluate(() => {
			return (performance as any).memory
				? {
						usedJSHeapSize: Math.round(
							(performance as any).memory.usedJSHeapSize / 1024 / 1024,
						),
						totalJSHeapSize: Math.round(
							(performance as any).memory.totalJSHeapSize / 1024 / 1024,
						),
					}
				: null;
		});

		if (memoryInfo) {
			console.log(
				`🧠 Memory usage: ${memoryInfo.usedJSHeapSize}MB / ${memoryInfo.totalJSHeapSize}MB`,
			);
			expect(memoryInfo.usedJSHeapSize).toBeLessThan(50); // Should use less than 50MB
		}
	});

	test("React Query cache efficiency", async ({ page }) => {
		console.log("🚀 Testing React Query cache efficiency...");

		// Load jars page
		await page.goto("/jars");
		await page.waitForSelector(".cj-card-primary");

		// Navigate to jar detail
		await page.click(".cj-card-primary");
		await page.waitForSelector("h1");

		// Navigate back - should load from cache
		const cacheStartTime = Date.now();
		await page.goBack();
		await page.waitForSelector(".cj-card-primary");
		const cacheLoadTime = Date.now() - cacheStartTime;

		console.log(`⚡ Cache load time: ${cacheLoadTime}ms`);

		// Cache should be much faster than initial load
		expect(cacheLoadTime).toBeLessThan(2000); // Should be under 2 seconds from cache
	});

	test("Mobile performance", async ({ page, browserName }) => {
		// Only run on mobile Chrome
		test.skip(browserName !== "chromium", "Mobile test only for Chromium");

		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });

		console.log("📱 Testing mobile performance...");

		const startTime = Date.now();
		await page.goto("/");
		await page.waitForLoadState("networkidle");
		const mobileLoadTime = Date.now() - startTime;

		console.log(`📱 Mobile load time: ${mobileLoadTime}ms`);

		// Mobile should still be reasonably fast
		expect(mobileLoadTime).toBeLessThan(8000); // 8 seconds max on mobile

		// Check for layout shifts
		const cls = await page.evaluate(() => {
			return new Promise((resolve) => {
				let clsValue = 0;
				new PerformanceObserver((list) => {
					for (const entry of list.getEntries()) {
						if (
							entry.entryType === "layout-shift" &&
							!(entry as any).hadRecentInput
						) {
							clsValue += (entry as any).value;
						}
					}
					resolve(clsValue);
				}).observe({ entryTypes: ["layout-shift"] });

				// Resolve after 3 seconds
				setTimeout(() => resolve(clsValue), 3000);
			});
		});

		console.log(`📐 Cumulative Layout Shift: ${cls}`);
		expect(cls).toBeLessThan(0.1); // Good CLS score
	});
});
