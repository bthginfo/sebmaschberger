import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {getDependencyReport} from '@/lib/server/dependency-inventory';
import {dependencyWorkflowUrl} from '@/lib/server/dependency-audit';

const headers={'Cache-Control':'private, no-store'};
export async function GET(){
 try{await requireAdmin();}catch{return NextResponse.json({error:'Anmeldung als Inhaber erforderlich.'},{status:403,headers});}
 const workflow=dependencyWorkflowUrl();
 try{return NextResponse.json({report:await getDependencyReport(),workflow},{headers});}
 catch{return NextResponse.json({report:null,workflow},{status:503,headers});}
}
