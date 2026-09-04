function failureResult({
  source = "",
  fetchedAt = "",
  error = "Offer description acquisition failed",
} = {}) {
  return {
    success: false,
    description: "",
    source,
    fetchedAt,
    error,
  };
}


export async function fetchOfferDescription({
  endpoint = "",
  offerUrl = "",
  fetchImpl = fetch,
} = {}) {
  const normalizedEndpoint =
    String(endpoint || "").trim();

  const normalizedOfferUrl =
    String(offerUrl || "").trim();

  if (!normalizedEndpoint) {
    return failureResult({
      source: normalizedOfferUrl,
      error: "Missing acquisition endpoint",
    });
  }

  if (!normalizedOfferUrl) {
    return failureResult({
      error: "Missing offer URL",
    });
  }

  try {
    const requestUrl =
      new URL(normalizedEndpoint);

    requestUrl.searchParams.set(
      "action",
      "fetchOfferDescription"
    );

    requestUrl.searchParams.set(
      "url",
      normalizedOfferUrl
    );

    const response =
      await fetchImpl(
        requestUrl.toString()
      );

    if (!response || !response.ok) {
      return failureResult({
        source: normalizedOfferUrl,
        error: "Offer description request failed",
      });
    }

    const payload =
      await response.json();

    if (
      !payload ||
      typeof payload !== "object"
    ) {
      return failureResult({
        source: normalizedOfferUrl,
        error:
          "Invalid acquisition response",
      });
    }

    const description =
      String(
        payload.description || ""
      ).trim();

    const source =
      String(
        payload.source ||
          normalizedOfferUrl
      ).trim();

    const fetchedAt =
      String(
        payload.fetchedAt || ""
      ).trim();

    if (
      payload.success !== true ||
      !description
    ) {
      return failureResult({
        source,
        fetchedAt,
        error:
          String(
            payload.error ||
              "Offer description unavailable"
          ),
      });
    }

    return {
      success: true,
      description,
      source,
      fetchedAt,
      error: "",
    };
  } catch (error) {
    return failureResult({
      source: normalizedOfferUrl,
      error:
        error && error.message
          ? String(error.message)
          : "Offer description request failed",
    });
  }
}
