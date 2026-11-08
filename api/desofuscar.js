export const maxDuration = 60;

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

  const { textoOfuscado } = req.body;
  if (!textoOfuscado) {
    return res.status(400).json({ error: 'No se envió texto' });
  }

  const prompt = `Eres un experto en ciberseguridad. Analiza y desofusca el siguiente script. Devuelve solo el código limpio y funcional:\n\n${textoOfuscado}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4000
        }
      }),
      signal: AbortSignal.timeout(55000)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Error de Gemini:", errorData);
      throw new Error(`Error de Gemini: ${response.status}`);
    }

    const data = await response.json();
    const textoLimpio = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudo desofuscar.';

    return res.status(200).json({ resultado: textoLimpio });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'La IA tardó demasiado o hubo un problema de conexión. Intenta de nuevo.' });
  }
}
