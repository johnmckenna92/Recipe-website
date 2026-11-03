exports.handler = async function(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json"
  };

  // 1. Preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Successful preflight" })
    };
  }

  // 2. Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed. Send a POST request." })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const userPrompt = body.prompt;

    if (!userPrompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing 'prompt' in request body." })
      };
    }

    const apiKey = process.env.AI_API_KEY;
    const metaPrompt = process.env.AI_META_PROMPT || "You are a helpful assistant.";

    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Missing AI_API_KEY environment variable in Netlify." })
      };
    }

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
        body: JSON.stringify({ error: "OpenAI API returned an error.", details: data })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ result: data.choices[0].message.content })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server execution error.", details: error.message })
    };
  }
};
