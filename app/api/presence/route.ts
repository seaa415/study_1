import {getCurrentUser} from '../../auth';
import {createClient} from '../../../lib/supabase/server';
import {crossSiteWrite} from '../../../lib/request-safety';
export async function POST(req:Request){if(crossSiteWrite(req))return new Response(null,{status:403});const user=await getCurrentUser();if(!user)return new Response(null,{status:401});const db=await createClient();const {error}=await db.rpc('record_room_visit');return new Response(null,{status:error?503:204})}
