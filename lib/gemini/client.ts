// Shared Gemini helper — uses direct REST to v1 API to bypass SDK v1beta routing
// gemini-2.5-flash is verified available on this API key via v1

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`;

export async function callGeminiV1(prompt: string, maxTokens = 8192): Promise<string> {
    const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: maxTokens,
            },
        }),
        signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API ${res.status}: ${errText.substring(0, 300)}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini API');
    return text;
}

export { GEMINI_MODEL };
