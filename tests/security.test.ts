import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {safeReturn} from '../lib/redirect.ts';
import {canRead,canEdit,type StoredRecord} from '../lib/access.ts';

test('redirects stay inside the app',()=>{assert.equal(safeReturn('//evil.example'),'/');assert.equal(safeReturn('/\\evil.example'),'/');assert.equal(safeReturn('https://evil.example'),'/');assert.equal(safeReturn('/room'),'/room');assert.equal(safeReturn('/auth/signout'),'/')});
test('private ancestor hides its child',()=>{const parent:StoredRecord={id:'p',kind:'project',owner:'a',visibility:'private',parent:null,data:'{}'};const child:StoredRecord={...parent,id:'c',kind:'comment',owner:'b',visibility:'shared',parent:'p'};const all=new Map([['p',parent],['c',child]]);assert.equal(canRead(child,'b',all),false);assert.equal(canRead(child,'a',all),true);assert.equal(canEdit(parent,'b'),false)});

test('database and file policies isolate writers while allowing team edits',async()=>{
 const db=new PGlite();
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',file='33333333-3333-4333-8333-333333333333';
 try{
 await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);
 create table storage.objects(id serial primary key,bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
 grant usage on schema public,auth,storage to anon,authenticated;
 grant select,insert on storage.objects to anon,authenticated;
 grant usage on sequence storage.objects_id_seq to authenticated;
 insert into auth.users values ('${a}'),('${b}');`);
 await db.exec(await readFile(new URL('../supabase/setup.sql',import.meta.url),'utf8'));
 async function as(user:string|null){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user||'']);await db.exec(user?'set role authenticated':'set role anon')}
 async function insert(id:string,kind:string,owner:string,visibility='shared',parent:string|null=null,extra:Record<string,unknown>={}){return db.query('insert into public.records(id,kind,owner,visibility,parent,data) values($1,$2,$3,$4,$5,$6::jsonb)',[id,kind,owner,visibility,parent,JSON.stringify({title:'검증용',progress:0,...extra})])}
 await as(a);await insert('profile_'+a,'member',a);await insert('private-a','project',a,'private');await insert('shared-a','project',a);
 await db.query('insert into public.uploads(id,owner,path,filename) values($1,$2,$3,$4)',[file,a,a+'/'+file,'script.txt']);
 await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['study-files',a+'/'+file]);
 await insert('file-a','resource',a,'private',null,{url:'/api/files?key='+file});
 await insert('team-goal','teamGoal',a);await insert('study-rules','rules',a);
 await as(b);await insert('profile_'+b,'member',b);await insert('comment-b','comment',b,'shared','shared-a');
 assert.equal((await db.query("select id from public.records where id='private-a'")).rows.length,0);
 assert.equal((await db.query('select * from storage.objects')).rows.length,0);
 await assert.rejects(()=>insert('forged-file','resource',b,'shared',null,{url:'/api/files?key='+file}));
 await assert.rejects(()=>insert('private-comment','comment',b,'shared','private-a'));
 assert.equal((await db.query("update public.records set data=jsonb_set(data,'{title}','\"wrong\"') where id='shared-a' returning id")).rows.length,0);
 await db.query("update public.records set owner=$1,data=jsonb_set(data,'{title}','\"공동 수정\"') where id in ('team-goal','study-rules')",[b]);
 assert.equal((await db.query('select owner from public.records where id=$1',['team-goal'])).rows[0].owner,b);
 await as(a);await db.query("update public.records set visibility='private' where id='shared-a'");
 await as(b);assert.equal((await db.query("select * from public.records where id='comment-b'")).rows.length,0);
 await as(null);assert.equal((await db.query("select * from public.records where id='comment-b'")).rows.length,0);
 await as(a);await db.query("update public.records set visibility='shared' where id='file-a'");
 await as(null);assert.equal((await db.query('select * from storage.objects')).rows.length,1);await assert.rejects(()=>insert('anon','goal',a));
 await as(a);await db.query("update public.records set visibility='private' where id='file-a'");
 await as(null);assert.equal((await db.query('select * from storage.objects')).rows.length,0);
 await as(a);await db.query("delete from public.records where id='shared-a'");
 await db.exec('reset role');assert.equal((await db.query("select * from public.records where id='comment-b'")).rows.length,0);
 }finally{await db.close()}
});
