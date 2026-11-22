import {apiError,json} from '../http';
import {CommerceError} from './model';

export function commerceHandler(fn:(request:Request)=>Promise<Response>){return async(request:Request)=>{try{return await fn(request);}catch(error){return error instanceof CommerceError?json({error:error.message,code:error.code},error.status):apiError(error);}};}
