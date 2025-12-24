import https from 'https';
import middleware from './_common/middleware.js';
import { fetchWappalyzergo } from './_common/wappalyzergo.js';

const featuresHandler = async (url) => {
  const apiKey = process.env.BUILT_WITH_API_KEY;

  if (!url) {
    throw new Error('URL query parameter is required');
  }

  const buildWappalyzerFallback = async (reason) => {
    const fallback = await fetchWappalyzergo(url);
    if (!fallback) {
      return { skipped: reason };
    }
    const technologies = Array.isArray(fallback.technologies) ? fallback.technologies : [];
    return {
      provider: fallback.provider || 'wappalyzergo',
      last: Math.floor(Date.now() / 1000),
      groups: [
        {
          name: 'Detected technologies',
          categories: technologies.map((tech) => ({
            name: tech.name,
            live: 'Detected',
          })),
        },
      ],
    };
  };

  if (!apiKey) {
    return buildWappalyzerFallback('BuiltWith API key not configured (BUILT_WITH_API_KEY).');
  }

  const apiUrl = `https://api.builtwith.com/free1/api.json?KEY=${apiKey}&LOOKUP=${encodeURIComponent(url)}`;

  try {
    const response = await new Promise((resolve, reject) => {
      const req = https.get(apiUrl, res => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode <= 299) {
            resolve(data);
          } else {
            reject(new Error(`Request failed with status code: ${res.statusCode}`));
          }
        });
      });

      req.on('error', error => {
        reject(error);
      });

      req.end();
    });

    return response;
  } catch (error) {
    const message = error?.message || 'Unknown error';
    if (message.includes('status code: 429')) {
      return buildWappalyzerFallback('BuiltWith rate limit exceeded (HTTP 429). Try again later.');
    }
    if (message.includes('status code: 401') || message.includes('status code: 402') || message.includes('status code: 403')) {
      return buildWappalyzerFallback('BuiltWith API plan does not permit this lookup.');
    }
    throw new Error(`Error making request: ${message}`);
  }
};

export const handler = middleware(featuresHandler);
export default handler;
