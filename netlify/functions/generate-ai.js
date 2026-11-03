exports.handler = async function(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json"
  };

  // Preflight OPTIONS check
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "CORS OK" })
    };
  }

  // Reject non-POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed. Send a POST request." })
    };
  }

  try {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Server Error: AI_API_KEY missing in Netlify settings." })
      };
    }

    const body = JSON.parse(event.body || "{}");
    const userPrompt = body.prompt;

    if (!userPrompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing 'prompt' field in JSON request body." })
      };
    }

    const metaPrompt = process.env.AI_META_PROMPT || "You are a helpful assistant.";

    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: metaPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7
      })
    });

    const data = await openAiResponse.json();

    if (!openAiResponse.ok) {
      return {
        statusCode: openAiResponse.status,
        headers,
        body: JSON.stringify({ error: "OpenAI error", details: data })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ result: data.choices[0].message.content })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server execution failed", details: err.message })
    };
  }
};
