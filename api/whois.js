import net from "node:net";
import axios from "axios";
import psl from "psl";
import middleware from "./_common/middleware.js";

const getBaseDomain = (url) => {
	let protocol = "";
	if (url.startsWith("http://")) {
		protocol = "http://";
	} else if (url.startsWith("https://")) {
		protocol = "https://";
	}
	const noProtocolUrl = url.replace(protocol, "");
	const parsed = psl.parse(noProtocolUrl);
	return protocol + parsed.domain;
};

const parseWhoisData = (data) => {
	if (data.includes("No match for")) {
		return { error: "No matches found for domain in internic database" };
	}

	const lines = data.split("\r\n");
	const parsedData = {};

	let lastKey = "";

	for (const line of lines) {
		const index = line.indexOf(":");
		if (index === -1) {
			if (lastKey !== "") {
				parsedData[lastKey] += ` ${line.trim()}`;
			}
			continue;
		}
		let key = line.slice(0, index).trim();
		const value = line.slice(index + 1).trim();
		if (value.length === 0) continue;
		key = key.replace(/\W+/g, "_");
		lastKey = key;

		parsedData[key] = value;
	}

	return parsedData;
};

const fetchFromInternic = async (hostname) => {
	return new Promise((resolve, reject) => {
		const client = net.createConnection(
			{ port: 43, host: "whois.internic.net" },
			() => {
				client.write(`${hostname}\r\n`);
			},
		);

		let data = "";
		client.on("data", (chunk) => {
			data += chunk;
		});

		client.on("end", () => {
			try {
				const parsedData = parseWhoisData(data);
				resolve(parsedData);
			} catch (error) {
				reject(error);
			}
		});

		client.on("error", (err) => {
			reject(err);
		});
	});
};

const fetchFromRdap = async (hostname) => {
	try {
		const response = await axios.get(`https://rdap.org/domain/${hostname}`);
		return response.data;
	} catch (error) {
		console.error("Error fetching data from RDAP:", error.message);
		return null;
	}
};

const whoisHandler = async (rawUrl) => {
	const normalizedUrl =
		rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
			? rawUrl
			: `http://${rawUrl}`;

	let hostname;
	try {
		hostname = getBaseDomain(new URL(normalizedUrl).hostname);
	} catch (error) {
		throw new Error(`Unable to parse URL: ${error}`);
	}

	const [internicData, whoisData] = await Promise.all([
		fetchFromInternic(hostname),
		fetchFromRdap(hostname),
	]);

	return {
		internicData,
		whoisData,
	};
};

export const handler = middleware(whoisHandler);
export default handler;
