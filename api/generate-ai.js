module.exports = async function handler(req, res) {
  // Set CORS headers so GitHub Pages can fetch from Vercel
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 1. Handle browser CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Reject non-POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Expected POST.' });
  }

  try {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing AI_API_KEY in Vercel Environment Variables.' });
    }

    const { prompt: userPrompt } = req.body || {};
    if (!userPrompt) {
      return res.status(400).json({ error: "Missing 'prompt' field in request body." });
    }

    const metaPrompt = process.env.AI_META_PROMPT || 'You are a helpful grocery list and recipe assistant.';

    // 3. Call Google Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
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
      return res.status(geminiResponse.status).json({ error: 'Google Gemini API error', details: data });
    }

    // 4. Extract text response
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ result: generatedText });

  } catch (err) {
    return res.status(500).json({ error: 'Server execution failed', details: err.message });
  }
};
