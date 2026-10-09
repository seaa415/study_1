import {createClient} from '../../../lib/supabase/server';
import {safeReturn} from '../../../lib/redirect';
export async function GET(request:Request){const url=new URL(request.url),code=url.searchParams.get('code');if(code){const client=await createClient();const {error}=await client.auth.exchangeCodeForSession(code);if(!error)return Response.redirect(new URL(safeReturn(url.searchParams.get('next')),url.origin),303)}return Response.redirect(new URL('/login?error=expired',url.origin),303)}
