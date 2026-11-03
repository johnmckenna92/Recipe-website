exports.handler = async function(event, context) {
  // 1. Standardize headers to force JSON responses and allow frontend access
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*", // Adjust to your domain in production
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  // 2. Handle CORS preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "CORS preflight successful" })
    };
  }

  // 3. Reject non-POST requests cleanly
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed. Expected POST." })
    };
  }

  try {
    // 4. Safely parse the frontend payload
    const body = JSON.parse(event.body);
    const userPrompt = body.prompt; // Ensure your frontend sends { "prompt": "..." }

    if (!userPrompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing 'prompt' in request body." })
      };
    }

    // 5. Retrieve environment variables
    const apiKey = process.env.AI_API_KEY;
    const metaPrompt = process.env.AI_META_PROMPT || "You are a helpful assistant.";

    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Server misconfiguration: Missing API Key." })
      };
    }

    // 6. Call the OpenAI API
    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Update to your preferred model
        messages: [
          { role: "system", content: metaPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7
      })
    });

    // 7. Handle OpenAI API errors gracefully
    if (!openAiResponse.ok) {
      const errorData = await openAiResponse.json().catch(() => ({}));
      return {
        statusCode: openAiResponse.status,
        headers,
        body: JSON.stringify({ 
          error: "OpenAI API request failed.", 
          details: errorData 
        })
      };
    }

    // 8. Parse and return the successful AI response
    const data = await openAiResponse.json();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        result: data.choices[0].message.content 
      })
    };

  } catch (error) {
    // 9. Catch JSON.parse errors or network failures and return as JSON
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "Internal Server Error", 
        details: error.message 
      })
    };
  }
};
