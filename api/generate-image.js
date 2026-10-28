// Justice AI image generation: prefer current Nano Banana models, then fall back to the legacy image endpoint.
// Uses the existing server-side GEMINI_API_KEY. Never expose the key to the browser.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST to generate an image.' }); }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Image generation is not connected: GEMINI_API_KEY is missing from Vercel Environment Variables.' });

  const body = req.body || {};
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) return res.status(400).json({ error: 'Describe the image you want to create.' });
  if (prompt.length > 2500) return res.status(413).json({ error: 'Please keep the image description under 2,500 characters.' });

  const styles = ['Photorealistic', 'Cinematic', '3D illustration', 'Anime', 'Graphic design', 'Watercolor'];
  const style = styles.includes(body.style) ? body.style : 'Photorealistic';
  const ratios = { square: '1:1', landscape: '16:9', portrait: '9:16' };
  const ratio = ratios[body.ratio] || '1:1';
  const sizes = ['1K', '2K', '4K'];
  const imageSize = sizes.includes(body.imageSize) ? body.imageSize : '1K';
  const polishedPrompt = [
    'Create one original, polished, high-quality image. Follow the brief closely.',
    'Visual style: ' + style + '. Aspect ratio: ' + ratio + '. Target resolution: ' + imageSize + '.',
    'Make the result visually striking and professionally art-directed, with clear subject hierarchy, intentional composition, detailed textures, balanced lighting, rich but controlled color, clean edges, and a coherent background.',
    'If the brief requests a poster, logo, banner, cover, or advertisement, make the layout deliberate and readable. Render any requested wording accurately; do not add extra words, fake logos, signatures, or watermarks.',
    'Image brief: ' + prompt
  ].join('\n');

  const failures = [];
  async function requestJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data && data.error && data.error.message ? data.error.message : 'HTTP ' + response.status;
      failures.push({ status: response.status, message: String(message).slice(0, 500) });
      console.error('Gemini image model request failed:', response.status, String(message).slice(0, 300));
      return null;
    }
    return data;
  }
  function extractImage(data) {
    if (!data) return null;
    const blocks = [];
    if (data.output_image) blocks.push(data.output_image);
    if (Array.isArray(data.output)) blocks.push(...data.output);
    if (Array.isArray(data.candidates)) {
      for (const candidate of data.candidates) {
        if (candidate && candidate.content && Array.isArray(candidate.content.parts)) blocks.push(...candidate.content.parts);
      }
    }
    for (const block of blocks) {
      const mime = block.mime_type || block.mimeType || (block.inlineData && block.inlineData.mimeType) || 'image/png';
      const raw = block.data || (block.inlineData && block.inlineData.data);
      const isImage = block.type === 'image' || /^image\//.test(mime) || !!block.inlineData;
      if (raw && isImage && /^image\/(png|jpeg|webp)$/.test(mime)) return { data: raw, mime };
    }
    return null;
  }
  function extractText(data) {
    const pieces = [];
    if (data && Array.isArray(data.output)) for (const item of data.output) if (item && typeof item.text === 'string') pieces.push(item.text);
    if (data && Array.isArray(data.candidates)) for (const candidate of data.candidates) {
      for (const part of ((candidate.content && candidate.content.parts) || [])) if (part.text) pieces.push(part.text);
    }
    return pieces.join('\n').slice(0, 1000);
  }

  try {
    // Current high-quality image API. Image size and aspect ratio are explicitly requested.
    for (const model of ['gemini-nano-banana-2.1', 'gemini-3.1-flash-image']) {
      const data = await requestJson('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          model,
          input: polishedPrompt,
          response_format: { type: 'image', aspect_ratio: ratio, image_size: imageSize }
        })
      });
      const image = extractImage(data);
      if (image) return res.status(200).json({ image: 'data:' + image.mime + ';base64,' + image.data, text: extractText(data), model });
    }

    // Compatibility fallback for Gemini API projects that still have access to Nano Banana (2.5 Flash Image).
    const legacy = await requestJson('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: polishedPrompt }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: ratio, imageSize } }
      })
    });
    const legacyImage = extractImage(legacy);
    if (legacyImage) return res.status(200).json({ image: 'data:' + legacyImage.mime + ';base64,' + legacyImage.data, text: extractText(legacy), model: 'gemini-2.5-flash-image' });

    const last = failures[failures.length - 1];
    const allQuota = failures.length && failures.every(f => f.status === 429);
    const accessFailure = failures.some(f => f.status === 400 || f.status === 403 || f.status === 404);
    if (allQuota) return res.status(429).json({ error: 'Image generation quota is exhausted or unavailable for this Google AI project. Check its quota and billing settings, then try again later.' });
    if (accessFailure) return res.status(502).json({ error: 'Google rejected every available image model for this API key. Open Google AI Studio, check that the key belongs to the correct project and that image-generation models are enabled. Some newer high-quality image models require billing to be enabled.' });
    return res.status(502).json({ error: (last && last.message) ? 'Image generation failed: ' + last.message : 'The image service returned no image. Try a more specific prompt or check your Google AI model access.' });
  } catch (error) {
    console.error('Justice AI image generation failed:', error && error.message);
    return res.status(502).json({ error: 'Unable to reach Google image generation right now. Check your internet connection and Google AI project status.' });
  }
};
