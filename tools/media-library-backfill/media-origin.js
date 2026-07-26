import { canonicalizeHashedMediaUrl } from './media-identity.js';

export function getSiteAemPageOrigin(org, site, ref = 'main') {
  return `https://${ref}--${site}--${org}.entmseds.page`;
}

function toUrl(value, base) {
  try {
    return new URL(value, base);
  } catch {
    return null;
  }
}

function getCurrentSiteHosts(siteAemOrigin) {
  const siteAemUrl = toUrl(siteAemOrigin);
  if (!siteAemUrl) {
    return new Set();
  }

  const siteStem = siteAemUrl.hostname.endsWith('.entmseds.page')
    ? siteAemUrl.hostname.slice(0, -'.entmseds.page'.length)
    : '';

  return new Set([
    siteAemUrl.hostname,
    ...(siteStem ? [
      `${siteStem}.hlx.page`,
      `${siteStem}.entmseds.live`,
      `${siteStem}.hlx.live`,
    ] : []),
  ]);
}

export function resolveHtmlMediaBaseUrl(baseHref, fallbackBaseUrl) {
  const fallbackUrl = toUrl(fallbackBaseUrl);
  if (!fallbackUrl) {
    return fallbackBaseUrl;
  }

  if (!baseHref) {
    return fallbackUrl.toString();
  }

  const baseUrl = toUrl(baseHref, fallbackUrl.toString());
  if (!baseUrl) {
    return fallbackUrl.toString();
  }

  return baseUrl.origin === fallbackUrl.origin
    ? baseUrl.toString()
    : fallbackUrl.toString();
}

export function normalizeMediaUrlToCurrentSiteAemPage(
  rawUrl,
  {
    pageBaseUrl,
    siteAemOrigin,
    pageSourceUrl = '',
  } = {},
) {
  if (!rawUrl || !pageBaseUrl) {
    return null;
  }

  const normalizedInput = rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl;
  const mediaUrl = toUrl(normalizedInput, pageBaseUrl);
  if (!mediaUrl || !['http:', 'https:'].includes(mediaUrl.protocol)) {
    return null;
  }

  const siteAemUrl = toUrl(siteAemOrigin);
  if (!siteAemUrl) {
    return canonicalizeHashedMediaUrl(mediaUrl.toString());
  }

  const currentSiteHosts = getCurrentSiteHosts(siteAemOrigin);
  const pageBase = toUrl(pageBaseUrl);
  const pageSource = toUrl(pageSourceUrl);
  const isCurrentSiteUrl = currentSiteHosts.has(mediaUrl.hostname)
    || mediaUrl.origin === pageBase?.origin
    || mediaUrl.origin === pageSource?.origin;

  if (isCurrentSiteUrl) {
    mediaUrl.protocol = siteAemUrl.protocol;
    mediaUrl.host = siteAemUrl.host;
  } else if (mediaUrl.hostname.endsWith('.hlx.page')) {
    mediaUrl.hostname = mediaUrl.hostname.replace('.hlx.page', '.entmseds.page');
  } else if (mediaUrl.hostname.endsWith('.hlx.live')) {
    mediaUrl.hostname = mediaUrl.hostname.replace('.hlx.live', '.entmseds.page');
  } else if (mediaUrl.hostname.endsWith('.entmseds.live')) {
    mediaUrl.hostname = mediaUrl.hostname.replace('.entmseds.live', '.entmseds.page');
  }

  return canonicalizeHashedMediaUrl(mediaUrl.toString());
}
