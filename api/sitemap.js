import axios from "axios";
import xml2js from "xml2js";
import middleware from "./_common/middleware.js";

const sitemapHandler = async (url) => {
	let sitemapUrl = `${url}/sitemap.xml`;

	const hardTimeOut = 5000;

	try {
		// Try to fetch sitemap directly
		let sitemapRes;
		try {
			sitemapRes = await axios.get(sitemapUrl, { timeout: hardTimeOut });
		} catch (error) {
			if (error.response && error.response.status === 404) {
				// If sitemap not found, try to fetch it from robots.txt
				let robotsRes;
				try {
					robotsRes = await axios.get(`${url}/robots.txt`, {
						timeout: hardTimeOut,
					});
				} catch (robotsError) {
					if (robotsError.response && robotsError.response.status === 404) {
						return { skipped: "No sitemap found" };
					}
					throw robotsError;
				}

				const robotsTxt = robotsRes.data.split("\n");
				let sitemapFromRobots = "";

				for (const line of robotsTxt) {
					if (line.toLowerCase().startsWith("sitemap:")) {
						sitemapFromRobots = line.split(" ")[1].trim();
						break;
					}
				}

				if (!sitemapFromRobots) {
					return { skipped: "No sitemap found" };
				}

				sitemapUrl = sitemapFromRobots;
				try {
					sitemapRes = await axios.get(sitemapUrl, { timeout: hardTimeOut });
				} catch (sitemapFromRobotsError) {
					if (
						sitemapFromRobotsError.response &&
						sitemapFromRobotsError.response.status === 404
					) {
						return { skipped: "No sitemap found" };
					}
					throw sitemapFromRobotsError;
				}
			} else {
				throw error; // If other error, throw it
			}
		}

		const parser = new xml2js.Parser();
		const sitemap = await parser.parseStringPromise(sitemapRes.data);

		return sitemap;
	} catch (error) {
		if (error.code === "ECONNABORTED") {
			return { error: `Request timed-out after ${hardTimeOut}ms` };
		} else {
			return { error: error.message };
		}
	}
};

export const handler = middleware(sitemapHandler);
export default handler;
