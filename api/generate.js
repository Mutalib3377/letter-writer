// api/generate.js
// Vercel Serverless Function — proxies Groq API requests.
// The GROQ_API_KEY environment variable is set in Vercel project settings.

export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `You are an expert UK immigration consultant and professional letter writer working for Learn Ready, a trusted UK immigration guidance platform. Your role is to write highly personalised, professional, and compelling UK visa application letters that maximise the applicant's chances of approval.

LETTER WRITING RULES:
- Use formal British English (whilst, colour, organised, etc.)
- Never use weak phrases like "I humbly beg" or "I am writing to humbly request"
- Be specific — use the applicant's real details, never vague filler language
- Address any red flags (refusals, unemployment) confidently and honestly in the letter
- Cover letters and itinerary letters: 400–600 words
- Personal statements: 650–900 words
- Sponsorship letters: 350–500 words
- Always include a proper formal heading: applicant name, address line as [INSERT ADDRESS], date as [INSERT DATE], and a reference line
- Use [PLACEHOLDER] format clearly in square brackets for any information not provided
- Emphasise strong ties to home country prominently
- End with a clear, confident statement of intent to return and comply with all visa conditions
- Write in first person for cover letters and personal statements
- Write in first person from the sponsor's perspective for sponsorship letters
- Paragraphs must be well structured with clear line breaks between them

OUTPUT FORMAT:
Write the complete letter first, fully formatted with proper paragraphs and line breaks.
Then on a new line write exactly: LEARN_READY_TIPS:
Then write exactly 3 tips each starting on its own line with: TIP:
Example format:
LEARN_READY_TIPS:
TIP: Always attach 6 months of bank statements showing a consistent balance above the required threshold
TIP: Get your employer letter on official company letterhead with a stamp and HR signature
TIP: Include flight booking confirmation even if provisional — it shows serious intent`;

export default async function handler(req) {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured on server.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { prompt } = body;
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
    return new Response(JSON.stringify({ error: 'Invalid prompt.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2000,
        temperature: 0.5,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: prompt },
        ],
      }),
    });

    const data = await groqRes.json();

    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const letter = data.choices?.[0]?.message?.content ?? '';

    return new Response(JSON.stringify({ letter }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to reach AI service. Please try again.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
