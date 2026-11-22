import 'server-only';
import lock from '../../../package-lock.json';
import {cleanDependencies,readDependencyReport,type LockedDependency} from './dependency-audit';

const packages=Object.entries(lock.packages).flatMap(([path,metadata])=>{
 if(!path||!('version' in metadata)||!('resolved' in metadata)||!metadata.resolved.startsWith('https://registry.npmjs.org/'))return [];
 const name='name' in metadata?String(metadata.name):path.split('node_modules/').at(-1)??'';
 return [{name,version:metadata.version}] satisfies LockedDependency[];
});
const dependencies=cleanDependencies(packages);
export const getDependencyReport=()=>readDependencyReport(dependencies);
