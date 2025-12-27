import got from "got";
import middleware from "./_common/middleware.js";
import { fetchWappalyzergo } from "./_common/wappalyzergo.js";

const fetchBuiltWith = async (url, apiKey) => {
	const response = await got("https://api.builtwith.com/free1/api.json", {
		searchParams: { KEY: apiKey, LOOKUP: url },
		timeout: { request: 20000 },
	}).json();

	if (response?.Errors?.length) {
		const message = response.Errors[0]?.Message || "BuiltWith lookup failed";
		throw new Error(message);
	}

	return response;
};

const normalizeBuiltWith = (response) => {
	const paths = response?.Results?.[0]?.Result?.Paths || [];
	const technologies = paths.flatMap((path) => path?.Technologies || []);

	if (!technologies.length) {
		return {
			technologies: [],
			provider: "builtwith",
		};
	}

	return {
		technologies: technologies.map((tech) => {
			const categories =
				Array.isArray(tech.Categories) && tech.Categories.length
					? tech.Categories
					: tech.Tag
						? [tech.Tag]
						: [];
			return {
				name: tech.Name,
				version: tech.Version || "",
				confidence: 0,
				categories: categories.map((name) => ({ name })),
				icon: "",
				description: tech.Description || "",
				website: tech.Link || "",
			};
		}),
		provider: "builtwith",
	};
};

const normalizeWappalyzergo = (response) => {
	const technologies = Array.isArray(response?.technologies)
		? response.technologies
		: [];
	return {
		technologies: technologies.map((tech) => ({
			name: tech.name,
			version: tech.version || "",
			confidence: 0,
			categories: Array.isArray(tech.tags)
				? tech.tags.map((name) => ({ name }))
				: [],
			icon: "",
			description: tech.description || "",
			website: tech.website || "",
		})),
		provider: response?.provider || "wappalyzergo",
	};
};

const techStackHandler = async (url) => {
	const builtWithApiKey = process.env.BUILT_WITH_API_KEY;

	try {
		if (builtWithApiKey) {
			const response = await fetchBuiltWith(url, builtWithApiKey);
			return normalizeBuiltWith(response);
		}

		const fallback = await fetchWappalyzergo(url);
		if (fallback) {
			return normalizeWappalyzergo(fallback);
		}

		throw new Error(
			"Tech stack API key not configured. Set BUILT_WITH_API_KEY or WAPPALYZERGO_URL.",
		);
	} catch (error) {
		const fallback = await fetchWappalyzergo(url);
		if (fallback) {
			return normalizeWappalyzergo(fallback);
		}
		throw new Error(error.message);
	}
};

export const handler = middleware(techStackHandler);
export default handler;
