// Live OzBargain deals endpoint.
//
// The browser can't fetch ozbargain.com.au directly (no CORS headers on their
// feeds), so this function proxies it server-side. It also means the parsing
// rules live in one place and the client just consumes clean JSON.
const { fetchAllDeals } = require("../../scripts/lib/ozbargain");

exports.handler = async () => {
  try {
    const deals = await fetchAllDeals();
    if (!deals.length) {
      // Let the client fall back to its bundled snapshot rather than
      // rendering an empty feed.
      return { statusCode: 502, body: JSON.stringify({ error: "no deals parsed" }) };
    }
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        // Serve cached copies fast, refresh in the background. Deals don't
        // change second-to-second, and this keeps us light on OzBargain.
        "Cache-Control": "public, max-age=300, stale-while-revalidate=1800",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ capturedAt: new Date().toISOString(), deals: deals.slice(0, 60) }),
    };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: String(err) }) };
  }
};
