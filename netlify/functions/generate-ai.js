exports.handler = async function(event, context) {
  // Always include CORS headers on EVERY response path
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json"
  };

  // 1. Handle browser preflight (OPTIONS)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Preflight OK" })
    };
  }

  // 2. Reject non-POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    // 3. Check environment variable explicitly before calling OpenAI
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: "Netlify Environment Variable 'AI_API_KEY' is missing in Site Settings." 
        })
      };
    }

    // 4. Parse incoming body safely
    let userPrompt = "";
    try {
      const parsedBody = JSON.parse(event.body || "{}");
      userPrompt = parsedBody.prompt;
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid JSON format in request body." })
      };
    }

    if (!userPrompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing 'prompt' field in payload." })
      };
    }

    const metaPrompt = process.env.AI_META_PROMPT || "You are a helpful assistant.";

    // 5. Call OpenAI API using standard fetch
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
        body: JSON.stringify({ 
          error: "OpenAI API returned an error response.", 
          details: data 
        })
      };
    }

    // 6. Return successful completion
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ result: data.choices[0].message.content })
    };

  } catch (err) {
    // 7. Catch any unexpected server crashes and return JSON + CORS
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "Server Crash: " + err.message 
      })
    };
  }
};
