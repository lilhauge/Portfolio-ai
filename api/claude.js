// Vercel serverless function — proxies requests to Anthropic API
// This avoids CORS issues and keeps the API key server-side

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured on server" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    // Forward Anthropic's status code and response
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Proxy error: " + err.message });
  }
}
