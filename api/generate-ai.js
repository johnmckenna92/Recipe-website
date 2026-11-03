module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing AI_API_KEY in Vercel settings.' });
    }

    const { prompt: userPrompt } = req.body || {};
    if (!userPrompt) {
      return res.status(400).json({ error: "Missing 'prompt' in request body." });
    }

    const metaPrompt = process.env.AI_META_PROMPT || "You are a helpful grocery list and recipe assistant.";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    let geminiResponse;
    let data;
    const maxRetries = 3;

    // Retry loop with pause delays specifically for temporary 503/429 demand spikes
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      data = await geminiResponse.json();

      if (geminiResponse.ok) {
        break;
      }

      // If hitting a 503 (High Demand) or 429 (Rate Limit), wait before retrying
      if ((geminiResponse.status === 503 || geminiResponse.status === 429) && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
        continue;
      }

      break;
    }

    if (!geminiResponse.ok) {
      return res.status(geminiResponse.status).json({
        error: 'Google Gemini API error',
        details: data
      });
    }

    const candidate = data.candidates?.[0];
    if (!candidate || candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
      return res.status(400).json({ 
        error: `Gemini produced no output. Finish reason: ${candidate?.finishReason || 'UNKNOWN'}` 
      });
    }

    let generatedText = candidate?.content?.parts?.[0]?.text || '';

    // Strip markdown formatting if present
    generatedText = generatedText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/\s*```$/, '')
      .trim();

    return res.status(200).json({ result: generatedText });

  } catch (err) {
    return res.status(500).json({ error: 'Server execution failed', details: err.message });
  }
};
