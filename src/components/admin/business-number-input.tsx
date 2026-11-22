"use client";
import {useEffect,useRef,useState} from 'react';
import {Input} from './admin-ui';
/** Preserve commas and incomplete input; never silently clamp a financial value. */
export function BusinessNumberInput({value,onChange,money=false,optional=false,min=0,max=100000000,decimals=2,disabled,label}:{value:number|undefined;onChange:(value:number|undefined)=>void;money?:boolean;optional?:boolean;min?:number;max?:number;decimals?:number;disabled?:boolean;label?:string}){
 const format=(v:number|undefined)=>v===undefined?'':Number.isFinite(v)?String(money?v/100:v).replace('.',','):'';
 const [draft,setDraft]=useState(()=>format(value)),focused=useRef(false);
 useEffect(()=>{if(!focused.current&&Number.isFinite(value))setDraft(format(value));},[value,money]);
 const parse=(raw:string)=>{if(!raw.trim())return optional?undefined:Number.NaN;const re=new RegExp('^\\d+(?:[.,]\\d{0,'+decimals+'})?$');if(!re.test(raw))return Number.NaN;const n=Number(raw.replace(',','.')),result=money?Math.round(n*100):n;return Number.isFinite(result)&&result>=min&&result<=max?result:Number.NaN;};
 return <Input aria-label={label} disabled={disabled} inputMode={decimals?'decimal':'numeric'} value={draft} onFocus={()=>{focused.current=true;}} onChange={e=>{setDraft(e.target.value);onChange(parse(e.target.value));}} onBlur={()=>{focused.current=false;const n=parse(draft);if(n===undefined||Number.isFinite(n))setDraft(format(n));}}/>;
}
