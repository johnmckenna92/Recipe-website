exports.handler = async function(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json"
  };

  // 1. Handle preflight CORS OPTIONS check
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "CORS preflight successful" })
    };
  }

  // 2. Enforce POST method
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
        body: JSON.stringify({ error: "Server Error: Missing AI_API_KEY environment variable in Netlify." })
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

    const metaPrompt = process.env.AI_META_PROMPT || "You are a helpful grocery list and recipe assistant.";

    // 3. Call Google Gemini API using gemini-3.8-flash
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: metaPrompt }]
        },
        contents: [
          {
            parts: [{ text: userPrompt }]
          }
        ]
      })
    });

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return {
        statusCode: geminiResponse.status,
        headers,
        body: JSON.stringify({ error: "Google Gemini API error", details: data })
      };
    }

    // 4. Extract generated text from Gemini's response payload
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ result: generatedText })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server execution failed", details: err.message })
    };
  }
};
