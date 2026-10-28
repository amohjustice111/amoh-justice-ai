// Generate images using the existing Gemini API key; no new provider credentials.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({error:'Use POST to generate an image.'}); }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({error:'Image generation is not connected. Add GEMINI_API_KEY in Vercel settings.'});
  const body=req.body||{}, prompt=typeof body.prompt==='string'?body.prompt.trim():'';
  if(!prompt) return res.status(400).json({error:'Describe the image you want to create.'});
  if(prompt.length>2500) return res.status(413).json({error:'Please keep the image prompt under 2,500 characters.'});
  const styles=['Photorealistic','Cinematic','3D illustration','Anime','Graphic design','Watercolor'];
  const style=styles.includes(body.style)?body.style:'Photorealistic';
  const ratio=['square','landscape','portrait'].includes(body.ratio)?body.ratio:'square';
  const ratioText={square:'square 1:1 composition',landscape:'wide landscape composition, approximately 16:9',portrait:'vertical portrait composition, approximately 9:16'}[ratio];
  try {
    const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key='+encodeURIComponent(apiKey),{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({contents:[{role:'user',parts:[{text:'Generate one original image. Style: '+style+'. Composition: '+ratioText+'. Prompt: '+prompt}]}],generationConfig:{responseModalities:['TEXT','IMAGE']}})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      console.error('Gemini image API error:',response.status,data&&data.error&&data.error.message);
      if(response.status===429)return res.status(429).json({error:'Image generation quota is currently unavailable or exhausted. Please try later or check your Google AI quota and billing settings.'});
      if(response.status===400||response.status===403)return res.status(502).json({error:'Your current Gemini API key or project may not have access to this image model. Check model availability and billing/quota in Google AI Studio.'});
      return res.status(502).json({error:'The image service could not generate an image right now. Please try again.'});
    }
    const parts=(data.candidates||[]).flatMap(c=>(c.content&&c.content.parts)||[]);
    const img=parts.find(p=>p.inlineData&&p.inlineData.data);
    const text=parts.filter(p=>p.text).map(p=>p.text).join('\n').slice(0,1000);
    if(!img)return res.status(502).json({error:text||'The image model returned no image. Try a different prompt.'});
    const mime=img.inlineData.mimeType||'image/png';
    if(!/^image\/(png|jpeg|webp)$/.test(mime))return res.status(502).json({error:'The image service returned an unsupported image format.'});
    return res.status(200).json({image:'data:'+mime+';base64,'+img.inlineData.data,text});
  } catch(error) {
    console.error('Justice AI image generation failed:',error&&error.message);
    return res.status(502).json({error:'Unable to reach the image service. Please check your connection and try again.'});
  }
};