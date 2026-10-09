import Workspace from '../workspace';
import {requireUser} from '../auth';
export const dynamic='force-dynamic';
export default async function Room(){const user=await requireUser('/room');return <Workspace userId={user.userId} isAdmin={!!user.isAdmin} initialView="내 개인 룸"/>;}
