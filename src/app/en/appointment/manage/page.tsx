import type {Metadata} from 'next';
import {ManageAppointment} from '@/components/site/appointment-booking';
export const metadata:Metadata={title:'Manage your appointment',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function Manage(){return <ManageAppointment language="en"/>;}
