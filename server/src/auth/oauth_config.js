function parseUriList(value) {
  return String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function safeOrigin(urlValue) {
  try {
    return new URL(urlValue).origin;
  } catch {
    return null;
  }
}

function requestOrigin(req) {
  const protoHeader = String(req.get("x-forwarded-proto") || "").split(",")[0].trim();
  const hostHeader = String(req.get("x-forwarded-host") || req.get("host") || "")
    .split(",")[0]
    .trim();
  const proto = protoHeader || req.protocol || "http";
  if (!hostHeader) return null;
  return `${proto}://${hostHeader}`;
}

export function resolveRedirectUri(req, singleEnvKey, listEnvKey) {
  const currentOrigin = requestOrigin(req);
  const candidates = parseUriList(process.env[listEnvKey]);
  const single = String(process.env[singleEnvKey] || "").trim();

  if (single) candidates.push(single);
  if (!candidates.length) return "";
  if (!currentOrigin) return candidates[0];

  const exact = candidates.find((uri) => safeOrigin(uri) === currentOrigin);
  return exact || candidates[0];
}
