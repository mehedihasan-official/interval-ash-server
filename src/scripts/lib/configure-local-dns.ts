import dns from 'node:dns';

/**
 * Some Windows and corporate/ISP DNS resolvers can't answer MongoDB
 * Atlas's SRV records — the query returns ECONNREFUSED before the
 * driver even gets a chance to try connecting. Seed scripts always
 * run locally (never on Vercel), so it's safe to force a well-known
 * public resolver here regardless of what the OS is configured with.
 *
 * `DNS_SERVERS` in the environment still wins so a member can point at
 * an internal resolver when needed; Google + Cloudflare are the
 * fallback because both are effectively always reachable.
 */
export function configureLocalDns(): void {
  const raw = process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1,8.8.4.4';
  const servers = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (servers.length > 0) {
    dns.setServers(servers);
    console.log(`Using DNS resolvers: ${servers.join(', ')}`);
  }
}
