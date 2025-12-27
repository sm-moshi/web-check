import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOST_SUFFIXES = [".local", ".localhost", ".internal", ".lan"];

const isPrivateIpv4 = (ip) => {
	const parts = ip.split(".").map(Number);
	if (parts.length !== 4 || parts.some(Number.isNaN)) return true;

	const [a, b] = parts;
	if (a === 10) return true;
	if (a === 127) return true;
	if (a === 0) return true;
	if (a === 169 && b === 254) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 192 && b === 168) return true;
	if (a === 100 && b >= 64 && b <= 127) return true;
	if (a >= 224) return true;

	return false;
};

const isPrivateIpv6 = (ip) => {
	const normalized = ip.toLowerCase();
	if (normalized === "::" || normalized === "::1") return true;
	if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
	if (
		normalized.startsWith("fe8") ||
		normalized.startsWith("fe9") ||
		normalized.startsWith("fea") ||
		normalized.startsWith("feb")
	)
		return true;
	if (normalized.startsWith("ff")) return true;
	if (normalized.startsWith("2001:db8")) return true;

	return false;
};

const normalizeIp = (ip) => {
	if (ip.startsWith("::ffff:")) {
		return ip.replace("::ffff:", "");
	}
	return ip;
};

const isPrivateIp = (ip) => {
	const normalized = normalizeIp(ip);
	if (net.isIPv4(normalized)) return isPrivateIpv4(normalized);
	if (net.isIPv6(normalized)) return isPrivateIpv6(normalized);
	return true;
};

export const resolvePublicHost = async (host) => {
	const normalizedHost = (host || "").toLowerCase();
	if (!normalizedHost) {
		throw new Error("Invalid host provided");
	}

	if (
		normalizedHost === "localhost" ||
		BLOCKED_HOST_SUFFIXES.some((suffix) => normalizedHost.endsWith(suffix))
	) {
		throw new Error("Host is not allowed");
	}

	if (net.isIP(normalizedHost)) {
		if (isPrivateIp(normalizedHost)) {
			throw new Error("Host resolves to a private or reserved address");
		}
		return { host: normalizedHost, address: normalizedHost };
	}

	const addresses = await dns.lookup(normalizedHost, {
		all: true,
		verbatim: true,
	});
	if (!addresses.length) {
		throw new Error("Unable to resolve host");
	}

	if (addresses.some(({ address }) => isPrivateIp(address))) {
		throw new Error("Host resolves to a private or reserved address");
	}

	return { host: normalizedHost, address: addresses[0].address };
};
