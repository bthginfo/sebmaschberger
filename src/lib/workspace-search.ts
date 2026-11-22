const normalize=(value:string)=>value.toLocaleLowerCase('de').replaceAll('ß','ss').normalize('NFKD').replace(/\p{Mark}/gu,'').replace(/[^\p{Letter}\p{Number}]+/gu,' ').trim();

export function findWorkspaceAreas<T extends {label:string}>(items:readonly T[],query:string):T[]{
 const terms=normalize(query).split(' ').filter(Boolean);
 if(!terms.length)return [...items];
 return items.filter(item=>{
  const label=normalize(item.label);
  return terms.every(term=>label.includes(term));
 });
}
