import {createClient} from '../../../lib/supabase/server';
import {safeReturn} from '../../../lib/redirect';
export async function GET(request:Request){const url=new URL(request.url),token=url.searchParams.get('token_hash');if(token&&url.searchParams.get('type')==='email'){const client=await createClient();const {error}=await client.auth.verifyOtp({token_hash:token,type:'email'});if(!error)return Response.redirect(new URL(safeReturn(url.searchParams.get('next')),url.origin),303)}return Response.redirect(new URL('/login?error=expired',url.origin),303)}
