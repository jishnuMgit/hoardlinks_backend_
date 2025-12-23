export const getDeviceType = (userAgent?: string): string => {
  if (!userAgent) return "UNKNOWN";

  const ua = userAgent.toLowerCase();

  if (ua.includes("android")) return "ANDROID";
  if (ua.includes("iphone") || ua.includes("ipad")) return "IOS";
  if (ua.includes("windows") || ua.includes("mac")) return "WEB";

  return "UNKNOWN";
};
