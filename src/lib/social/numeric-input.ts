/** Keep incomplete edits local; only clamp after the user finishes the field. */
export function numericDraft(text:string,min:number,max:number,commit=false):number|null {
 if(!text.trim())return null;
 const value=Number(text);
 if(!Number.isFinite(value))return null;
 if(commit)return Math.max(min,Math.min(max,value));
 return value>=min&&value<=max?value:null;
}
