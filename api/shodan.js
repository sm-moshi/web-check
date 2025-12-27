import https from "node:https";
import net from "node:net";
import middleware from "./_common/middleware.js";

const extractHost = (input) => {
	try {
		return new URL(input).hostname;
	} catch (_error) {
		return input.replace(/^https?:\/\//, "").split("/")[0];
	}
};

const fetchShodan = (ip, apiKey) => {
	const apiUrl = `https://api.shodan.io/shodan/host/${ip}?key=${apiKey}`;
	return new Promise((resolve, reject) => {
		const req = https.get(apiUrl, (res) => {
			let data = "";

			res.on("data", (chunk) => {
				data += chunk;
			});

			res.on("end", () => {
				let parsed;
				try {
					parsed = JSON.parse(data);
				} catch (_error) {
					reject(new Error("Failed to parse Shodan response."));
					return;
				}

				if (res.statusCode >= 200 && res.statusCode <= 299) {
					resolve(parsed);
					return;
				}

				const message =
					parsed?.error || `Request failed with status code: ${res.statusCode}`;
				reject(new Error(message));
			});
		});

		req.on("error", (error) => {
			reject(error);
		});

		req.end();
	});
};

const shodanHandler = async (url) => {
	const apiKey = process.env.SHODAN_API_KEY;

	if (!apiKey) {
		return { skipped: "Shodan API key not configured (SHODAN_API_KEY)" };
	}

	const host = extractHost(url);
	if (!host || net.isIP(host) === 0) {
		return { error: "Invalid IP address provided for Shodan lookup." };
	}

	try {
		return await fetchShodan(host, apiKey);
	} catch (error) {
		const message = error?.message || "Unknown error";
		if (message.toLowerCase().includes("requires membership")) {
			return { skipped: message };
		}
		return { error: message };
	}
};

export const handler = middleware(shodanHandler);
export default handler;
