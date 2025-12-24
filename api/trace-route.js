import { execFile } from 'child_process';
import { promisify } from 'util';
import middleware from './_common/middleware.js';
import { resolvePublicHost } from './_common/host-guard.js';

const execFileAsync = promisify(execFile);

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parsePositiveFloat = (value, fallback) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseTracerouteOutput = (stdout) => {
  const lines = stdout.split('\n').map((line) => line.trim()).filter(Boolean);
  const results = [];

  for (const line of lines) {
    if (line.startsWith('traceroute ')) continue;
    const hopMatch = line.match(/^(\d+)\s+(.*)$/);
    if (!hopMatch) continue;

    const tokens = hopMatch[2].split(/\s+/);
    const host = tokens.shift() || '*';
    const times = [];

    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      if (token === '*') {
        times.push('*');
        continue;
      }

      if (token.endsWith('ms')) {
        const value = parseFloat(token.replace('ms', ''));
        if (!Number.isNaN(value)) times.push(value);
        continue;
      }

      if (tokens[i + 1] === 'ms') {
        const value = parseFloat(token);
        if (!Number.isNaN(value)) times.push(value);
        i += 1;
      }
    }

    results.push({ [host]: times.length ? times : ['*'] });
  }

  return results;
};

const traceRouteHandler = async (urlString, context) => {
  let host;
  try {
    host = new URL(urlString).hostname;
  } catch (error) {
    throw new Error('Invalid URL provided');
  }

  const { address } = await resolvePublicHost(host);
  const startTime = Date.now();
  const maxHops = parsePositiveInt(process.env.TRACEROUTE_MAX_HOPS, 15);
  const timeoutSec = parsePositiveFloat(process.env.TRACEROUTE_TIMEOUT_SEC, 2);
  const queries = parsePositiveInt(process.env.TRACEROUTE_QUERIES, 1);
  const { stdout } = await execFileAsync('traceroute', [
    '-n',
    '-w', String(timeoutSec),
    '-q', String(queries),
    '-m', String(maxHops),
    address,
  ]);
  const result = parseTracerouteOutput(stdout);

  return {
    message: 'Traceroute completed!',
    result,
    timeTaken: Date.now() - startTime,
  };
};

export const handler = middleware(traceRouteHandler);
export default handler;
