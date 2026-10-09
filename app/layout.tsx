import './globals.css';
import {getSiteSettings} from '../lib/settings-server';
export const dynamic='force-dynamic';
export async function generateMetadata(){const s=await getSiteSettings();return {title:s.siteName+' · '+s.studyName,description:s.tagline}}
export default async function Layout({children}:{children:React.ReactNode}){const s=await getSiteSettings();return <html lang="ko"><body data-theme={s.theme}>{children}</body></html>}
