import {crossSiteWrite} from '../../../lib/request-safety';
import {createClient} from '../../../lib/supabase/server';
import {getCurrentUser} from '../../auth';
import {visibleRecords,recordById,profileFor,unpack} from '../../../lib/records';
import {canEdit} from '../../../lib/access';
const kinds=['member','project','resource','event','goal','comment','version','feedback','teamGoal','rules'];
const noStore={'Cache-Control':'private, no-store'};
export async function GET(){try{const user=await getCurrentUser();const rows=await visibleRecords(user?.userId||null);const profiles=new Map(rows.filter(r=>r.kind==='member').map(r=>[r.owner,unpack(r).title]));return Response.json({records:rows.map(r=>({...unpack(r),member:profiles.get(r.owner)||unpack(r).member||'미등록 작가'}))},{headers:noStore});}catch(e){console.error(e);return Response.json({error:'데이터를 불러오지 못했습니다. 다시 시도해 주세요.'},{status:503,headers:noStore});}}
export async function POST(req:Request){if(crossSiteWrite(req))return Response.json({error:"이 사이트에서 직접 작성해 주세요."},{status:403});
 const user=await getCurrentUser();if(!user)return Response.json({error:'본인 계정으로 로그인해 주세요.'},{status:401});
 try{
 const r:any=await req.json();
 if(!r||!kinds.includes(r.kind)||typeof r.title!=='string'||!r.title.trim()||r.title.length>150||JSON.stringify(r).length>30000)return Response.json({error:'제목과 내용을 확인해 주세요.'},{status:400});
 if(['project','teamGoal'].includes(r.kind)&&(!Number.isFinite(Number(r.progress))||Number(r.progress)<0||Number(r.progress)>100))return Response.json({error:'완성률은 0~100 사이로 입력해 주세요.'},{status:400});
 if(r.notionUrl){const n=new URL(r.notionUrl);if(n.protocol!=='https:'||!/(^|\.)(notion\.so|notion\.site|notion\.com)$/.test(n.hostname))return Response.json({error:'올바른 노션 링크를 입력해 주세요.'},{status:400});}
 if(r.kind==='member'&&(typeof r.roomTitle!=='undefined'&&(typeof r.roomTitle!=='string'||r.roomTitle.length>60)))return Response.json({error:'창작룸 이름은 60자 이하로 입력해 주세요.'},{status:400});
 if(r.kind==='event'&&r.eventColor&&(!/^#[a-f0-9]{6}$/i.test(r.eventColor)))return Response.json({error:'올바른 일정 색상을 선택해 주세요.'},{status:400});
 const profile=await profileFor(user.userId);
 if(r.kind!=='member'&&!profile)return Response.json({error:'먼저 내 프로필을 만들어 주세요.'},{status:409});
 if(r.kind==='member'&&r.title.trim().length>24)return Response.json({error:'닉네임은 24자 이하로 입력해 주세요.'},{status:400});
 const collaborative=['teamGoal','rules'].includes(r.kind);
 if(r.completionMarker&& (r.kind!=='feedback'||typeof r.parent!=='string'||typeof r.completed!=='boolean'))return Response.json({error:'피드백 완료 항목을 확인해 주세요.'},{status:400});
 const id=r.completionMarker?'feedback-complete_'+r.parent+'_'+user.userId:collaborative?(r.kind==='teamGoal'?'team-goal':'study-rules'):r.kind==='member'?(profile?.id||'profile_'+user.userId):(r.id||crypto.randomUUID());
 const existing=await recordById(id);
 if(existing&&((!collaborative&&!canEdit(existing,user.userId))||existing.kind!==r.kind))return Response.json({error:'본인이 작성한 항목만 수정할 수 있습니다.'},{status:403});
 let visibility=r.visibility==='private'?'private':'shared';let parent=r.parent||null;
 if(['member','event','teamGoal','rules'].includes(r.kind)){visibility='shared';parent=null;}
 if(['comment','version'].includes(r.kind)&&!parent)return Response.json({error:'연결된 작품 또는 자료가 필요합니다.'},{status:400});
 if(parent){const permitted=await visibleRecords(user.userId);const p=permitted.find(x=>x.id===parent);if(!p)return Response.json({error:'접근할 수 없는 작품 또는 자료입니다.'},{status:403});if(r.kind==='version'&&!canEdit(p,user.userId))return Response.json({error:'본인 작품에만 버전을 추가할 수 있습니다.'},{status:403});if(existing&&existing.parent!==parent)return Response.json({error:'연결된 항목은 변경할 수 없습니다.'},{status:400});visibility=p.visibility;}
 for(const attachment of [r.url,r.coverUrl].filter(Boolean)){
 const attachmentUrl=attachment; if(typeof attachmentUrl!=='string')return Response.json({error:'사진 / 파일 주소를 확인해 주세요.'},{status:400});
 if(attachmentUrl){
 const match=/^\/api\/files\?key=([a-f0-9-]{36})$/.exec(attachmentUrl);
 if(match){const client=await createClient();const {data:file,error:fileError}=await client.from('uploads').select('owner').eq('id',match[1]).maybeSingle();if(fileError)throw fileError;if(!file||file.owner!==user.userId)return Response.json({error:'본인이 업로드한 파일만 첨부할 수 있습니다.'},{status:403});}
 else {const url=new URL(attachmentUrl);if(!['https:','http:'].includes(url.protocol))return Response.json({error:'올바른 문서 링크를 입력해 주세요.'},{status:400});}
 }
 }
 if(r.kind==='project'){if(r.category==='기타'&&(typeof r.customCategory!=='string'||!r.customCategory.trim()||r.customCategory.length>60))return Response.json({error:'기타 분류 이름을 입력해 주세요.'},{status:400});const previous=existing?unpack(existing):null;r.feedbackRequested=r.feedbackRequested===true&&visibility==='shared';r.feedbackRequestedAt=r.feedbackRequested?(previous?.feedbackRequested?previous.feedbackRequestedAt:new Date().toISOString()):null;}
 if(r.completionMarker){if(!parent)return Response.json({error:'관련 작품이 필요합니다.'},{status:400});const target=await recordById(parent);if(!target||target.kind!=='project')return Response.json({error:'작품을 찾을 수 없습니다.'},{status:400});r.participants=[];r.notes='';}
 if(r.kind==='member')r.lastVisitedAt=new Date().toISOString();
 if(r.kind==='goal'){if(!Number.isFinite(Number(r.progress||0))||Number(r.progress||0)<0||Number(r.progress||0)>100)return Response.json({error:'목표 진행률은 0~100 사이로 입력해 주세요.'},{status:400});const old=existing?unpack(existing):null;const now=new Date().toISOString();const before=old?.done?100:Number(old?.progress)||0;const progress=r.done?100:Math.max(0,Math.min(100,Number(r.progress)||0));r.progress=progress;r.done=progress===100;r.growthStartedAt=old?.growthStartedAt||now;r.growthAt=(!old||progress>before)?now:(old.growthAt||r.growthStartedAt);}
 const data={...r,id,parent,visibility,owner:user.userId,member:r.kind==='member'?r.title.trim():profile.title,title:r.title.trim()};
 const client=await createClient();const payload={id,kind:r.kind,data,updated:new Date().toISOString(),owner:user.userId,visibility,parent};const {error}=existing?await client.from('records').update(payload).eq('id',id):await client.from('records').insert(payload);if(error)throw error;
 return Response.json({ok:true,id});
 }catch(e){console.error(e);return Response.json({error:'저장하지 못했습니다. 입력 내용은 유지됩니다.'},{status:503});}
}
export async function DELETE(req:Request){if(crossSiteWrite(req))return Response.json({error:"이 사이트에서 직접 수정해 주세요."},{status:403});const user=await getCurrentUser();if(!user)return Response.json({error:'로그인이 필요합니다.'},{status:401});try{const {id}=await req.json() as any;const record=await recordById(id);if(!record||!canEdit(record,user.userId))return Response.json({error:'본인이 작성한 항목만 삭제할 수 있습니다.'},{status:403});if(['member','teamGoal','rules'].includes(record.kind))return Response.json({error:'프로필은 삭제 대신 수정해 주세요.'},{status:400});const client=await createClient();const {error}=await client.from('records').delete().eq('id',id);if(error)throw error;return Response.json({ok:true});}catch(e){console.error(e);return Response.json({error:'삭제하지 못했습니다.'},{status:503});}}
