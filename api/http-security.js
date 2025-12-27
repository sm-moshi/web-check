import axios from "axios";
import middleware from "./_common/middleware.js";

const httpsSecHandler = async (url) => {
	const fullUrl = url.startsWith("http") ? url : `http://${url}`;

	try {
		const response = await axios.get(fullUrl);
		const headers = response.headers;
		return {
			strictTransportPolicy: !!headers["strict-transport-security"],
			xFrameOptions: !!headers["x-frame-options"],
			xContentTypeOptions: !!headers["x-content-type-options"],
			xXSSProtection: !!headers["x-xss-protection"],
			contentSecurityPolicy: !!headers["content-security-policy"],
		};
	} catch (error) {
		return {
			statusCode: 500,
			body: JSON.stringify({ error: error.message }),
		};
	}
};

export const handler = middleware(httpsSecHandler);
export default handler;
