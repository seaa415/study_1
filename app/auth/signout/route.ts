import {createClient} from '../../../lib/supabase/server';
import {crossSiteWrite} from '../../../lib/request-safety';
export async function POST(request:Request){if(crossSiteWrite(request))return new Response('허용되지 않는 요청입니다.',{status:403});const supabase=await createClient();await supabase.auth.signOut();return Response.redirect(new URL('/',request.url),303)}
