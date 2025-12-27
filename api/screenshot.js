import { execFile } from "node:child_process";
import { promises as fs, constants as fsConstants } from "node:fs";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { v4 as uuidv4 } from "uuid";
import middleware from "./_common/middleware.js";

// Helper function for direct chromium screenshot as fallback
const directChromiumScreenshot = async (url, chromePath) => {
	console.log(
		`[DIRECT-SCREENSHOT] Starting direct screenshot process for URL: ${url}`,
	);

	// Create a tmp filename
	const tmpDir = "/tmp";
	const uuid = uuidv4();
	const screenshotPath = path.join(tmpDir, `screenshot-${uuid}.png`);

	console.log(`[DIRECT-SCREENSHOT] Will save screenshot to: ${screenshotPath}`);

	return new Promise((resolve, reject) => {
		const args = [
			"--headless",
			"--disable-gpu",
			"--no-sandbox",
			`--screenshot=${screenshotPath}`,
			url,
		];

		console.log(
			`[DIRECT-SCREENSHOT] Executing: ${chromePath} ${args.join(" ")}`,
		);

		execFile(chromePath, args, async (error, _stdout, _stderr) => {
			if (error) {
				console.error(`[DIRECT-SCREENSHOT] Chromium error: ${error.message}`);
				return reject(error);
			}

			try {
				// Read the screenshot file
				const screenshotData = await fs.readFile(screenshotPath);
				console.log(`[DIRECT-SCREENSHOT] Screenshot read successfully`);

				// Convert to base64
				const base64Data = screenshotData.toString("base64");

				await fs
					.unlink(screenshotPath)
					.catch((err) =>
						console.warn(
							`[DIRECT-SCREENSHOT] Failed to delete temp file: ${err.message}`,
						),
					);

				resolve(base64Data);
			} catch (readError) {
				console.error(
					`[DIRECT-SCREENSHOT] Failed reading screenshot: ${readError.message}`,
				);
				reject(readError);
			}
		});
	});
};

const resolveChromePath = async () => {
	if (process.env.CHROME_PATH) {
		return process.env.CHROME_PATH;
	}

	if (process.platform === "linux") {
		const executablePath = await chromium.executablePath();
		if (!executablePath) {
			throw new Error("Chromium executable path not found");
		}
		return executablePath;
	}

	const candidates = [];
	if (process.platform === "darwin") {
		candidates.push(
			"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
			"/Applications/Chromium.app/Contents/MacOS/Chromium",
			"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
		);
	}
	if (process.platform === "win32") {
		candidates.push(
			"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
			"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		);
	}

	for (const candidate of candidates) {
		try {
			await fs.access(candidate, fsConstants.X_OK);
			return candidate;
		} catch {
			// Try next candidate
		}
	}

	throw new Error("Chromium executable path not found");
};

const screenshotHandler = async (targetUrl) => {
	console.log(`[SCREENSHOT] Request received for URL: ${targetUrl}`);

	if (!targetUrl) {
		console.error("[SCREENSHOT] URL is missing from queryStringParameters");
		throw new Error("URL is missing from queryStringParameters");
	}

	if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
		targetUrl = `http://${targetUrl}`;
	}

	try {
		new URL(targetUrl);
	} catch (_error) {
		console.error(`[SCREENSHOT] URL provided is invalid: ${targetUrl}`);
		throw new Error("URL provided is invalid");
	}

	const chromePath = await resolveChromePath();

	// First try direct Chromium
	try {
		console.log(
			`[SCREENSHOT] Using direct Chromium method for URL: ${targetUrl}`,
		);
		const base64Screenshot = await directChromiumScreenshot(
			targetUrl,
			chromePath,
		);
		console.log(`[SCREENSHOT] Direct screenshot successful`);
		return { image: base64Screenshot };
	} catch (directError) {
		console.error(
			`[SCREENSHOT] Direct screenshot method failed: ${directError.message}`,
		);
		console.log(`[SCREENSHOT] Falling back to puppeteer method...`);
	}

	// fall back puppeteer
	let browser = null;
	try {
		console.log(`[SCREENSHOT] Launching puppeteer browser`);
		browser = await puppeteer.launch({
			args: [...chromium.args, "--no-sandbox"], // Add --no-sandbox flag
			defaultViewport: { width: 800, height: 600 },
			executablePath: chromePath,
			headless: true,
			ignoreHTTPSErrors: true,
			ignoreDefaultArgs: ["--disable-extensions"],
		});

		console.log(`[SCREENSHOT] Creating new page`);
		const page = await browser.newPage();

		console.log(`[SCREENSHOT] Setting page preferences`);
		await page.emulateMediaFeatures([
			{ name: "prefers-color-scheme", value: "dark" },
		]);
		page.setDefaultNavigationTimeout(8000);

		console.log(`[SCREENSHOT] Navigating to URL: ${targetUrl}`);
		await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

		console.log(`[SCREENSHOT] Checking if body element exists`);
		await page.evaluate(() => {
			const selector = "body";
			return new Promise((resolve, reject) => {
				const element = document.querySelector(selector);
				if (!element) {
					reject(
						new Error(`Error: No element found with selector: ${selector}`),
					);
				}
				resolve();
			});
		});

		console.log(`[SCREENSHOT] Taking screenshot`);
		const screenshotBuffer = await page.screenshot();

		console.log(`[SCREENSHOT] Converting screenshot to base64`);
		const base64Screenshot = screenshotBuffer.toString("base64");

		console.log(`[SCREENSHOT] Screenshot complete, returning image`);
		return { image: base64Screenshot };
	} catch (error) {
		console.error(`[SCREENSHOT] Puppeteer screenshot failed: ${error.message}`);
		throw error;
	} finally {
		if (browser !== null) {
			console.log(`[SCREENSHOT] Closing browser`);
			await browser.close();
		}
	}
};

export const handler = middleware(screenshotHandler);
export default handler;
