export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Falta la variable GEMINI_API_KEY en Vercel. Añádela y haz Redeploy.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const textoOfuscado = body && body.textoOfuscado;
  if (!textoOfuscado || typeof textoOfuscado !== 'string') {
    return res.status(400).json({ error: 'No se envió texto' });
  }

  const prompt = `Eres un experto en análisis de código Lua/Luau. Analiza y desofusca el siguiente script: renombra variables a nombres legibles, resuelve cadenas codificadas y simplifica el flujo de control. Devuelve solo el código limpio y funcional, sin explicaciones ni bloques markdown:\n\n${textoOfuscado}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: 0 }
          }
        }),
        signal: AbortSignal.timeout(55000)
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error de Gemini:', response.status, errorData);
      let detalle = `Gemini respondió con error ${response.status}.`;
      if (response.status === 400 || response.status === 403) detalle += ' Revisa que tu GEMINI_API_KEY sea válida.';
      if (response.status === 429) detalle += ' Límite de uso alcanzado, espera un minuto.';
      return res.status(502).json({ error: detalle });
    }

    const data = await response.json();

    if (data.promptFeedback && data.promptFeedback.blockReason) {
      return res.status(200).json({ error: 'Gemini bloqueó la petición (' + data.promptFeedback.blockReason + ').' });
    }

    const candidate = data.candidates && data.candidates[0];
    const partes = candidate && candidate.content && candidate.content.parts;
    let textoLimpio = partes ? partes.map(p => p.text || '').join('') : '';

    textoLimpio = textoLimpio.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```\s*$/, '').trim();

    if (!textoLimpio) {
      const motivo = candidate && candidate.finishReason ? ` (motivo: ${candidate.finishReason})` : '';
      return res.status(200).json({ error: 'La IA no devolvió resultado' + motivo + '.' });
    }

    return res.status(200).json({ resultado: textoLimpio });

  } catch (error) {
    console.error(error);
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return res.status(504).json({ error: 'La IA tardó demasiado. Prueba con un archivo más pequeño.' });
    }
    return res.status(500).json({ error: 'Error interno: ' + error.message });
  }
}
