import {rename,unlink} from 'node:fs/promises';

type FileOperations={rename:typeof rename;unlink:typeof unlink;wait:(milliseconds:number)=>Promise<void>};
const operations:FileOperations={rename,unlink,wait:milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds))};
const transient=new Set(['EACCES','EPERM','EBUSY']);

/** Keep the committed file intact while Windows briefly locks an atomic rename. */
export async function replaceLocalFile(temporary:string,destination:string,io:FileOperations=operations){
 let committed=false;
 try{
  for(let attempt=0;;attempt++){
   try{await io.rename(temporary,destination);committed=true;return;}
   catch(error){if(attempt>=4||!transient.has((error as NodeJS.ErrnoException).code??''))throw error;await io.wait(25*2**attempt);}
  }
 }finally{if(!committed)await io.unlink(temporary).catch(()=>undefined);}
}
