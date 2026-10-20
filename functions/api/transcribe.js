// Cloudflare Pages Function — configure GROQ_API_KEY as an encrypted secret.
export async function onRequestPost({request,env}) {
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
  const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(!env.GROQ_API_KEY)return json({error:'Configure GROQ_API_KEY nos segredos do Cloudflare Pages.'},503);
  const length=Number(request.headers.get('content-length')||0);
  if(length>25*1024*1024)return json({error:'Áudio acima de 25 MB. Grave um trecho menor.'},413);
  try {
    const form=await request.formData();const audio=form.get('audio');
    if(!audio||typeof audio.arrayBuffer!=='function')return json({error:'Arquivo de áudio não enviado.'},400);
    if(audio.size>24*1024*1024)return json({error:'Áudio acima de 24 MB. Grave um trecho menor.'},413);
    if(!['audio/webm','audio/mp4','video/webm','video/mp4','audio/ogg'].some(x=>audio.type.startsWith(x)))return json({error:'Formato de áudio não suportado.'},400);
    const payload=new FormData();payload.append('file',audio,audio.name||'consulta.webm');payload.append('model','whisper-large-v3-turbo');payload.append('language','pt');payload.append('response_format','json');
    const result=await fetch('https://api.groq.com/openai/v1/audio/transcriptions',{method:'POST',headers:{Authorization:'Bearer '+env.GROQ_API_KEY},body:payload});
    const data=await result.json().catch(()=>({}));
    if(!result.ok)return json({error:result.status===429?'Limite gratuito de transcrição atingido. Tente novamente mais tarde.':(data.error?.message||'Erro no serviço de transcrição.')},result.status===429?429:502);
    return json({text:data.text||''});
  }catch(e){return json({error:'Não foi possível processar o áudio.'},500)}
}
