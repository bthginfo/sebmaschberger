import { MAX_VIDEO_DURATION_MS, type VideoUpload } from './video-model';

export async function inspectVideo(blob:Blob,mimeType:VideoUpload['mimeType']){
 const media=await import('mediabunny');
 const format=mimeType==='video/mp4'?media.MP4:media.WEBM;
 const input=new media.Input({source:new media.BlobSource(blob),formats:[format]});
 try{
  const track=await input.getPrimaryVideoTrack();
  if(!track)throw new Error('missing-video');
  const [width,height,codec,first,end]=await Promise.all([
   track.getDisplayWidth(),track.getDisplayHeight(),track.getCodec(),track.getFirstTimestamp(),track.computeDuration(),
  ]);
  const durationMs=Math.round((end-first)*1000);
  const validCodec=mimeType==='video/mp4'?codec==='avc':codec==='vp8'||codec==='vp9';
  if(!validCodec)throw new Error('Bitte verwenden Sie MP4 mit H.264 oder WebM mit VP8/VP9.');
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||width>3840||height>3840||width*height>3840*2160)
   throw new Error('Die Auflösung darf höchstens 4K betragen.');
  if(!Number.isFinite(durationMs)||durationMs<100||durationMs>MAX_VIDEO_DURATION_MS)
   throw new Error('Die Videodauer muss zwischen 0,1 und 90 Sekunden liegen.');
  return {width,height,durationMs};
 }catch(error){
  const message=error instanceof Error&&error.message;
  if(message&&/^(Bitte verwenden Sie|Die Auflösung|Die Videodauer)/.test(message))throw error;
  throw new Error('Die Videodatei konnte nicht gelesen werden. Wählen Sie ein gültiges MP4 oder WebM.');
 }finally{input.dispose();}
}
