// lib/ipLocation.ts

// Simple IP geolocation - in production, you'd use a service like ipapi.co or ip-api.com
export async function getLocationFromIP(ip: string): Promise<string> {
  // Handle localhost/private IPs
  if (!ip || ip === "unknown" || ip.startsWith("127.") || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return "Seattle, WA"; // Default for local development
  }

  try {
    // Use a free IP geolocation service
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=city,region,country,countryCode`, {
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });

    if (response.ok) {
      const data = await response.json();
      if (data.city && data.region) {
        return `${data.city}, ${data.region}`;
      }
      if (data.city && data.countryCode) {
        return `${data.city}, ${data.countryCode}`;
      }
    }
  } catch (error) {
    // Silently fall through to default
    console.warn(`[IP-LOCATION] Failed to get location for ${ip}:`, error);
  }

  // Fallback to default location
  return "Seattle, WA";
}
