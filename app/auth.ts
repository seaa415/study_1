import {redirect} from 'next/navigation';
import {createClient} from '../lib/supabase/server';
import {configured} from '../lib/supabase/config';
import {safeReturn} from '../lib/redirect';
export async function getCurrentUser(){if(!configured())return null;const supabase=await createClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user)return null;return {userId:user.id,email:user.email||'',fullName:user.user_metadata?.full_name||null};}
export async function requireUser(returnTo:string){const user=await getCurrentUser();if(!user)redirect('/login?return_to='+encodeURIComponent(safeReturn(returnTo)));return user}
