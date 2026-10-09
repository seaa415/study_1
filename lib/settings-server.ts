import 'server-only';
import {createClient} from './supabase/server';
import {configured} from './supabase/config';
import {defaults,validateSettings} from './site-settings';
export async function getSiteSettings(){if(!configured())return defaults;try{const client=await createClient();const {data,error}=await client.from('site_settings').select('settings').eq('id','site').maybeSingle();if(error)return defaults;return validateSettings(data?.settings)||defaults}catch{return defaults}}
