import {notFound} from 'next/navigation';
import {requireUser} from '../auth';
import {getSiteSettings} from '../../lib/settings-server';
import AdminSettings from './settings';
export const dynamic='force-dynamic';
export default async function Admin(){const user=await requireUser('/admin');if(!user.isAdmin)notFound();return <AdminSettings initial={await getSiteSettings()}/>}
