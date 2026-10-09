import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {configured,credentials} from './lib/supabase/config';
export async function proxy(request:NextRequest){let response=NextResponse.next({request});if(!configured())return response;const {url,key}=credentials();const supabase=createServerClient(url,key,{cookies:{getAll(){return request.cookies.getAll()},setAll(values){values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,options));response.headers.set('Cache-Control','private, no-store')}}});await supabase.auth.getClaims();return response}
export const config={matcher:['/((?!_next/static|_next/image|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']};
