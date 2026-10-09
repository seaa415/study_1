import {getCurrentUser} from '../../auth';
import {getSiteSettings} from '../../../lib/settings-server';
import {validateSettings} from '../../../lib/site-settings';
import {createClient} from '../../../lib/supabase/server';
import {crossSiteWrite} from '../../../lib/request-safety';
export async function GET(){return Response.json({settings:await getSiteSettings()},{headers:{'Cache-Control':'no-store'}})}
export async function PUT(request:Request){if(crossSiteWrite(request))return Response.json({error:'허용되지 않은 요청입니다.'},{status:403});const user=await getCurrentUser();if(!user?.isAdmin)return Response.json({error:'관리자만 사이트 설정을 수정할 수 있습니다.'},{status:403});let input;try{input=await request.json()}catch{return Response.json({error:'입력 내용을 확인해 주세요.'},{status:400})}const settings=validateSettings(input);if(!settings)return Response.json({error:'사이트 이름과 소개, 테마를 확인해 주세요.'},{status:400});const client=await createClient();const {data,error}=await client.from('site_settings').update({settings,updated:new Date().toISOString()}).eq('id','site').select('id').maybeSingle();if(error||!data)return Response.json({error:'설정을 저장하지 못했습니다.'},{status:503});return Response.json({settings})}
