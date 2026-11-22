import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import initial from '@/data/creator-demo.json';
import type {WebsiteContent} from '@/lib/types';
import {publicPageSnapshot} from '@/lib/content';
import {DemoCmsLoader} from '@/components/creator/demo/demo-cms-loader';
import {DemoCreatorSite} from '@/components/creator/demo/demo-site';
export const metadata:Metadata={title:'Fiktives Creator-Beispiel',robots:{index:false,follow:false}};
export const revalidate=false;
export default async function CreatorDemo({params}:{params:Promise<{creator:string;path?:string[]}>}){const{creator,path=[]}=await params;const{content}=await publicPageSnapshot('');const config=content.config.modules?.creator;if(!config?.enabled||config.demoBasePath!=='/demo/'+creator)notFound();const fixture=initial as WebsiteContent;const slug=path.join('/');if(slug==='cms')return <DemoCmsLoader initialContent={fixture}/>;return <DemoCreatorSite initialContent={fixture} pageSlug={slug}/>;}
