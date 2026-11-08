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

  // NUEVO PROMPT: Análisis Forense en lugar de reescritura mágica
  const prompt = `Eres un experto en ingeniería inversa y ciberseguridad, especializado en ofuscadores de Lua/Luau como MoonVeil.
  
  El siguiente script está altamente ofuscado. NO intentes inventar el código original limpio, ya que es una máquina virtual compleja.
  
  En su lugar, realiza un ANÁLISIS ESTÁTICO y devuélveme un reporte con lo siguiente:
  1. Identifica qué ofuscador es y su versión (ej. MoonVeil 2.1.1).
  2. Extrae todas las cadenas de texto (strings) legibles o cifradas que encuentres.
  3. Identifica los bloques de bytes principales (arrays).
  4. Explica brevemente la estructura de la Máquina Virtual (VM) si la tiene.
  5. Si detectas una capa simple como Base64 o un XOR básico, intenta decodificarla y muestra el resultado.
  
  Aquí está el script:
  \n\n${textoOfuscado}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.2, // Un poco más de creatividad para el análisis
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
    const textoLimpio = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudo analizar.';

    return res.status(200).json({ resultado: textoLimpio });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'La IA tardó demasiado o hubo un problema. Intenta de nuevo.' });
  }
}
