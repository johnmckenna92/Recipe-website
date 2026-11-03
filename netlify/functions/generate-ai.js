export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // 1. Grab secrets and meta-prompt from Netlify environment variables
  const apiKey = process.env.AI_API_KEY;
  const metaPrompt = process.env.AI_META_PROMPT;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key is missing on server" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // Parse user input if sent from the frontend button click
    const body = await req.json();
    const userPrompt = body.prompt || "Generate a recipe";

    // Combine your secret meta-prompt with the user's input request
    const combinedPrompt = `${metaPrompt}\n\nUser Request: ${userPrompt}`;

    // 2. Call the AI Provider API (Example using OpenAI chat completions endpoint)
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
    const outputText = data.choices[0].message.content;

    // 3. Send the result back securely to your HTML page
    return new Response(JSON.stringify({ result: outputText }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
