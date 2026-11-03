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

    // Fallback model list if high-demand (503) occurs on a specific endpoint
    const models = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash'
    ];

    let lastError = null;

    for (const model of models) {
      // Retry up to 2 times per model with a brief delay
      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const geminiResponse = await fetch(geminiUrl, {
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

        const data = await geminiResponse.json();

        if (geminiResponse.ok) {
          const candidate = data.candidates?.[0];
          if (!candidate || candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
            return res.status(400).json({ 
              error: `Gemini produced no output. Finish reason: ${candidate?.finishReason || 'UNKNOWN'}` 
            });
          }

          let generatedText = candidate?.content?.parts?.[0]?.text || '';

          // Clean markdown wrappers
          generatedText = generatedText
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/, '')
            .replace(/\s*```$/, '')
            .trim();

          return res.status(200).json({ result: generatedText });
        }

        lastError = { status: geminiResponse.status, data };

        // If error is not a high demand/rate limit error (503/429), switch model immediately
        if (geminiResponse.status !== 503 && geminiResponse.status !== 429) {
          break;
        }
      }
    }

    return res.status(lastError?.status || 500).json({
      error: 'Google Gemini API unavailable across fallbacks.',
      details: lastError?.data
    });

  } catch (err) {
    return res.status(500).json({ error: 'Server execution failed', details: err.message });
  }
};
