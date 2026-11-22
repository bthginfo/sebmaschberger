import type {Metadata} from 'next';
import {ManageAppointment} from '@/components/site/appointment-booking';
export const metadata:Metadata={title:'Termin verwalten',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function Manage(){return <ManageAppointment language="de"/>;}
