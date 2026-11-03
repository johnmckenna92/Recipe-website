exports.handler = async function(event, context) {
  // Ensure it's a POST request
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  const apiKey = process.env.AI_API_KEY;
  const metaPrompt = process.env.AI_META_PROMPT;

  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server Configuration Error: AI_API_KEY is missing in Netlify environment variables." })
    };
  }

  if (!metaPrompt) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server Configuration Error: AI_META_PROMPT is missing in Netlify environment variables." })
    };
  }

  try {
    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch (e) {
      // fallback if body is empty or malformed
    }

    const userPrompt = body.prompt || "Generate a grocery list analysis";
    const combinedPrompt = `${metaPrompt}\n\nUser Request / Ingredients:\n${userPrompt}`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: combinedPrompt }]
      })
    });

    const data = await aiResponse.json();

    if (!aiResponse.ok) {
      const errorMessage = data.error?.message || "Unknown error from AI provider";
      return {
        statusCode: aiResponse.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: `AI Provider Error: ${errorMessage}` })
      };
    }

    const outputText = data.choices?.[0]?.message?.content || "No response generated.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result: outputText })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: `Function execution error: ${error.message}` })
    };
  }
};
