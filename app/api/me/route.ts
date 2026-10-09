import {getCurrentUser} from '../../auth';
import {profileFor} from '../../../lib/records';
export async function GET(){const user=await getCurrentUser();if(!user)return Response.json({user:null,profile:null},{headers:{'Cache-Control':'private, no-store'}});try{return Response.json({user:{id:user.userId,name:user.fullName||''},profile:await profileFor(user.userId)},{headers:{'Cache-Control':'private, no-store'}})}catch(e){console.error(e);return Response.json({error:'프로필을 불러오지 못했습니다.'},{status:503});}}
