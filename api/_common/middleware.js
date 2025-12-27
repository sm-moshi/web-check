const normalizeUrl = (url) => {
	return url.startsWith("http") ? url : `https://${url}`;
};

// If present, set a shorter timeout for API requests
const TIMEOUT = process.env.API_TIMEOUT_LIMIT
	? parseInt(process.env.API_TIMEOUT_LIMIT, 10)
	: 60000;

// If present, set CORS allowed origins for responses
const ALLOWED_ORIGINS = process.env.API_CORS_ORIGIN || "*";

// Disable everything :( Setting this env var will turn off the instance, and show message
const DISABLE_EVERYTHING = !!process.env.VITE_DISABLE_EVERYTHING;

// Platform fixed to NODE
const PLATFORM = "NODE";

// Define the headers to be returned with each response
const headers = {
	"Access-Control-Allow-Origin": ALLOWED_ORIGINS,
	"Access-Control-Allow-Credentials": true,
	"Content-Type": "application/json;charset=UTF-8",
};

const timeoutErrorMsg =
	'You can re-trigger this request, by clicking "Retry"\n' +
	"If you're running your own instance of Web Check, then you can " +
	"resolve this issue, by increasing the timeout limit in the " +
	"`API_TIMEOUT_LIMIT` environmental variable to a higher value (in milliseconds).\n\n" +
	`The public instance currently has a lower timeout of ${TIMEOUT}ms ` +
	"in order to keep running costs affordable, so that Web Check can " +
	"remain freely available for everyone.";

const disabledErrorMsg =
	"Error - WebCheck Temporarily Disabled.\n\n" +
	"We're sorry, but due to the increased cost of running Web Check " +
	"we've had to temporatily disable the public instand. " +
	"We're activley looking for affordable ways to keep Web Check running, " +
	"while free to use for everybody.\n" +
	"In the meantime, since we've made our code free and open source, " +
	"you can get Web Check running on your own system, by following the instructions in our GitHub repo";

// A middleware function used by all API routes on all platforms
const commonMiddleware = (handler) => {
	// Create a timeout promise, to throw an error if a request takes too long
	const createTimeoutPromise = (timeoutMs) => {
		return new Promise((_, reject) => {
			setTimeout(() => {
				reject(new Error(`Request timed-out after ${timeoutMs} ms`));
			}, timeoutMs);
		});
	};

	// Single handler (Node/Express style)
	const nodeHandler = async (request, response) => {
		if (DISABLE_EVERYTHING) {
			response.status(503).json({ error: disabledErrorMsg });
		}

		const queryParams = request.query || {};
		const rawUrl = queryParams.url;

		if (!rawUrl) {
			return response.status(500).json({ error: "No URL specified" });
		}

		const url = normalizeUrl(rawUrl);

		try {
			// Race the handler against the timeout
			const handlerResponse = await Promise.race([
				handler(url, request),
				createTimeoutPromise(TIMEOUT),
			]);

			if (handlerResponse.body && handlerResponse.statusCode) {
				response.status(handlerResponse.statusCode).json(handlerResponse.body);
			} else {
				response
					.status(200)
					.json(
						typeof handlerResponse === "object"
							? handlerResponse
							: JSON.parse(handlerResponse),
					);
			}
		} catch (error) {
			let errorCode = 500;
			if (error.message.includes("timed-out") || response.statusCode === 504) {
				errorCode = 408;
				error.message = `${error.message}\n\n${timeoutErrorMsg}`;
			}
			response.status(errorCode).json({ error: error.message });
		}
	};

	return nodeHandler;
};

export default commonMiddleware;
