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

  const prompt = `Desofusca el siguiente script y devuelve solo el código limpio:\n\n${textoOfuscado}`;

  try {
    const response = await fetch('https://api-inference.huggingface.co/models/TeanShow/Deepseek-cybersec-33b-instruct', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HF_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 4000, temperature: 0.2, return_full_text: false }
      })
    });

    if (!response.ok) {
      throw new Error(`Error de Hugging Face: ${response.status}`);
    }

    const data = await response.json();
    const textoLimpio = Array.isArray(data) ? data[0].generated_text : data.generated_text;

    return res.status(200).json({ resultado: textoLimpio });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al procesar con la IA.' });
  }
}
