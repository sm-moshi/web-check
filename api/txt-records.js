import dns from "node:dns/promises";
import middleware from "./_common/middleware.js";

const txtRecordHandler = async (url, _event, _context) => {
	try {
		const parsedUrl = new URL(url);

		const txtRecords = await dns.resolveTxt(parsedUrl.hostname);

		// Parsing and formatting TXT records into a single object without
		// repeatedly spreading accumulators (O(n^2)).
		const readableTxtRecords = {};
		for (const recordArray of txtRecords) {
			for (const recordString of recordArray) {
				const [key, ...rest] = recordString.split("=");
				const value = rest.join("=");
				if (key) {
					readableTxtRecords[key] = value;
				}
			}
		}

		return readableTxtRecords;
	} catch (error) {
		if (error.code === "ERR_INVALID_URL") {
			throw new Error(`Invalid URL ${error}`);
		} else {
			throw error;
		}
	}
};

export const handler = middleware(txtRecordHandler);
export default handler;
