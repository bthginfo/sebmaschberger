export class BodyLimitError extends Error{}
/** Enforce bytes while reading, including chunked requests without Content-Length. */
export async function limitedBody(request:Request,maxBytes:number){
 const length=request.headers.get('content-length');if(length&&(!/^\d+$/.test(length)||Number(length)>maxBytes))throw new BodyLimitError('Die Anfrage ist zu groß.');
 const reader=request.body?.getReader();if(!reader)return new Uint8Array();const chunks:Uint8Array[]=[];let total=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){/* Leave socket cleanup to the server so SvelteKit can deliver the 413 response. */throw new BodyLimitError('Die Anfrage ist zu groß.');}chunks.push(value);}}finally{reader.releaseLock();}
 const body=new Uint8Array(total);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}return body;
}
