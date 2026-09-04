const LINE_BREAK = "\u0000";


function decodeHtmlEntities(value = "") {
  return String(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(
        Number.parseInt(code, 16)
      )
    );
}


export function htmlToOfferText(html = "") {
  const source = String(html || "");

  if (!source.trim()) {
    return "";
  }

  const cleaned = source
    .replace(
      /<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi,
      ""
    )
    .replace(
      /<br\s*\/?>/gi,
      LINE_BREAK
    )
    .replace(
      /<\/?(?:h[1-6]|p|li|ul|ol|div|section|article|header|footer)\b[^>]*>/gi,
      LINE_BREAK
    )
    .replace(/<[^>]+>/g, "");

  return decodeHtmlEntities(cleaned)
    .split(LINE_BREAK)
    .map((part) =>
      part
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean)
    .join("\n");
}
