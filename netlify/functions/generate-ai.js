exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  const apiKey = process.env.AI_API_KEY;
  const metaPrompt = process.env.AI_META_PROMPT;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API key is missing on server environment variables" })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const userPrompt = body.prompt || "Generate a recipe";
    const combinedPrompt = `${metaPrompt}\n\nUser Request: ${userPrompt}`;

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
      throw new Error(data.error?.message || "Failed to communicate with OpenAI");
    }

    const outputText = data.choices[0].message.content;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result: outputText })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message })
    };
  }
};
