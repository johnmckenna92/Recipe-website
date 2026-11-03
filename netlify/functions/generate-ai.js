exports.handler = async function(event, context) {
  // CORS and JSON response headers required for cross-origin requests from GitHub Pages
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  // 1. Immediately handle browser CORS preflight (OPTIONS) requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: headers,
      body: ""
    };
  }

  // 2. Reject non-POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: headers,
      body: JSON.stringify({ error: "Method Not Allowed. Expected POST." })
    };
  }

  try {
    // 3. Parse payload
    const body = JSON.parse(event.body || "{}");
    const userPrompt = body.prompt;

    if (!userPrompt) {
      return {
        statusCode: 400,
        headers: headers,
        body: JSON.stringify({ error: "Missing 'prompt' in request body." })
      };
    }

    // 4. Retrieve Netlify environment variables
    const apiKey = process.env.AI_API_KEY;
    const metaPrompt = process.env.AI_META_PROMPT || "You are a helpful grocery list assistant.";

    if (!apiKey) {
      return {
        statusCode: 500,
        headers: headers,
        body: JSON.stringify({ error: "Server error: Missing AI_API_KEY environment variable on Netlify." })
      };
    }

    // 5. Call OpenAI Chat Completions API
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
        headers: headers,
        body: JSON.stringify({ error: "OpenAI API error", details: data })
      };
    }

    // 6. Return successful completion text
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({ result: data.choices[0].message.content })
    };

  } catch (err) {
    // 7. Catch any unexpected errors and return formatted JSON
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ error: "Internal Server Error", details: err.message })
    };
  }
};
