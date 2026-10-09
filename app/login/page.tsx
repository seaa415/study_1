import {Suspense} from 'react';
import Login from './login';
export default function Page(){return <Suspense fallback={<p>로그인 화면을 준비하고 있습니다…</p>}><Login/></Suspense>}
