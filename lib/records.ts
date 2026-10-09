import {createClient} from './supabase/server';
import type {StoredRecord} from './access';
function stored(row:any):StoredRecord{return {...row,data:JSON.stringify(row.data)}}
export async function visibleRecords(_userId:string|null){const db=await createClient();const {data,error}=await db.from('records').select('*').order('updated',{ascending:false});if(error)throw error;return (data||[]).map(stored)}
export async function recordById(id:string){const db=await createClient();const {data,error}=await db.from('records').select('*').eq('id',id).maybeSingle();if(error)throw error;return data?stored(data):null}
export function unpack(r:StoredRecord){return {...JSON.parse(r.data),id:r.id,kind:r.kind,owner:r.owner,visibility:r.visibility,parent:r.parent,updated:r.updated}}
export async function profileFor(userId:string){const db=await createClient();const {data,error}=await db.from('records').select('*').eq('kind','member').eq('owner',userId).maybeSingle();if(error)throw error;return data?unpack(stored(data)):null}
