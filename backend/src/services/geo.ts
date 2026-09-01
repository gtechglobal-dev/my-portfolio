// Lightweight IP geolocation lookup used to track the country/state of each
// verification scan. Falls back gracefully if the service is unreachable.

interface GeoInfo {
  ip: string;
  country: string;
  countryCode: string;
  state: string;
  stateCode: string;
  city: string;
  region: string;
}

// Providers, tried in order. Each returns a normalized GeoInfo.
const PROVIDERS: Array<(ip: string) => Promise<Partial<GeoInfo>>> = [
  // ipwho.is — returns region (state/province), region_code, city, country, country_code
  async (ip: string) => {
    const res = await fetch(`https://ipwho.is/${ip}`, {
      headers: { 'User-Agent': 'gtech-portfolio-verify' },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`ipwho.is ${res.status}`);
    const d = await res.json();
    if (!d || d.success === false) throw new Error('ipwho.is failed');
    return {
      country: d.country || '',
      countryCode: d.country_code || '',
      state: d.region || '',
      stateCode: d.region_code || '',
      city: d.city || '',
    };
  },
  // ip-api.com (https, no key) — returns regionName, region, city, country, countryCode
  async (ip: string) => {
    const res = await fetch(`https://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city`, {
      headers: { 'User-Agent': 'gtech-portfolio-verify' },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`ip-api.com ${res.status}`);
    const d = await res.json();
    if (d.status !== 'success') throw new Error('ip-api.com failed');
    return {
      country: d.country || '',
      countryCode: d.countryCode || '',
      state: d.regionName || d.region || '',
      stateCode: d.region || '',
      city: d.city || '',
    };
  },
];

export async function geoLocate(ip: string): Promise<GeoInfo> {
  const base: GeoInfo = {
    ip,
    country: 'Unknown',
    countryCode: '',
    state: 'Unknown',
    stateCode: '',
    city: 'Unknown',
    region: 'Unknown',
  };

  if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return base;
  }

  for (const provider of PROVIDERS) {
    try {
      const info = await provider(ip);
      if (info.state || info.country) {
        return {
          ...base,
          ...info,
          region: info.state || info.country || 'Unknown',
        };
      }
    } catch {
      // try next provider
    }
  }

  return base;
}
