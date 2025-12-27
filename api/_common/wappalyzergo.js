import got from "got";

const getServiceUrl = () => process.env.WAPPALYZERGO_URL;

export const fetchWappalyzergo = async (url) => {
	const baseUrl = getServiceUrl();
	if (!baseUrl) {
		return null;
	}
	const timeoutMs = parseInt(
		process.env.WAPPALYZERGO_TIMEOUT_MS || "12000",
		10,
	);
	const response = await got(`${baseUrl.replace(/\/$/, "")}/analyze`, {
		searchParams: { url },
		timeout: { request: timeoutMs },
	}).json();
	return response;
};

export default fetchWappalyzergo;
