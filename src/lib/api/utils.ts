import { type NextRequest } from 'next/server';

/**
 * Extracts and validates the client IP address from the request.
 * Checks common proxy headers and request.ip, extracting only the first valid IP.
 * Returns null if no valid IPv4 or IPv6 address is found, avoiding invalid INET inserts.
 */
export function extractClientIp(request: NextRequest): string | null {
  const headersToCheck = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
    'true-client-ip',
  ];

  let rawIp: string | undefined;

  for (const header of headersToCheck) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for can be a comma-separated list. Take the first one.
      rawIp = value.split(',')[0].trim();
      break;
    }
  }

  // Next.js (depending on deployment) might attach .ip to NextRequest in some contexts (e.g. Vercel),
  // but it's not typed on standard NextRequest. We can cast to any to check if it exists dynamically.
  if (!rawIp && (request as any).ip) {
    rawIp = (request as any).ip;
  }

  if (!rawIp) {
    return null;
  }

  // Basic validation for IPv4 and IPv6
  const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])$/;

  if (ipv4Regex.test(rawIp) || ipv6Regex.test(rawIp)) {
    return rawIp;
  }

  return null;
}
