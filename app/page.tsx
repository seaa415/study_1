import Workspace from './workspace';
import {getCurrentUser} from './auth';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getCurrentUser();return <Workspace userId={user?.userId||null}/>;}
