// Netlify Function: /.netlify/functions/chat
// Keeps the Gemini API key server-side. The browser never sees it.
//
// SETUP REQUIRED:
// 1. In Netlify dashboard: Site settings > Environment variables > add GEMINI_API_KEY
//    (get a free key at aistudio.google.com)
// 2. This site must be deployed via GitHub (or Netlify CLI) — plain drag-and-drop deploy
//    does not run serverless functions.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let userMessages;
  try {
    const body = JSON.parse(event.body);
    userMessages = body.messages; // [{ role: 'user'|'assistant', content: '...' }, ...]
    if (!Array.isArray(userMessages) || userMessages.length === 0) {
      throw new Error('messages must be a non-empty array');
    }
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const systemPrompt = `You are the Cinepax cinema booking assistant. You help customers with:
- Finding showtimes and movies at Cinepax locations (Amanah Mall Lahore, Boulevard Mall Hyderabad, HotelOne Faisalabad, Jinnah Park Rawalpindi, Kings Mall Gujranwala, Mall of Sialkot, Nayyar Mall Gujrat, Ocean Mall Karachi, Packages Mall Lahore, World Trade Center Islamabad)
- Explaining ticket prices (Silver seats: Rs 650, Gold seats: Rs 900)
- Explaining film ratings (US MPA, UK BBFC, and Pakistan's local U/A system)
- General booking, refund, and cinema policy questions

Keep answers short and conversational — this is a chat widget, not an essay. If you don't have real-time showtime data, say so honestly and direct the user to the "Now Showing" section instead of guessing.`;

  const geminiContents = userMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: geminiContents
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return { statusCode: response.status, body: JSON.stringify({ error: errText }) };
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";

    return {
      statusCode: 200,
      body: JSON.stringify({ reply })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error contacting Gemini' }) };
  }
};
