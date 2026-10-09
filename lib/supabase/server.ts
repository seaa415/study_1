import 'server-only';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {credentials} from './config';
export async function createClient(){const store=await cookies();const {url,key}=credentials();return createServerClient(url,key,{cookies:{getAll(){return store.getAll()},setAll(values){try{values.forEach(({name,value,options})=>store.set(name,value,options))}catch{/* Server Components: the proxy refreshes the cookies. */}}}})}
