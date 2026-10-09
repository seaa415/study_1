# 멤버에게 보낼 온라인 링크 만들기

이 프로젝트는 **GitHub → Vercel**로 게시하고 **Supabase**에 계정·자료를 저장합니다. 아래 설정은 사이트를 처음 게시할 때 한 번 필요합니다.

## 1. Supabase 준비

1. https://supabase.com/dashboard 에 로그인하고 새 프로젝트를 만듭니다. 지역은 팀과 가까운 지역을 선택합니다.
2. **SQL Editor → New query**를 열어 이 프로젝트의 `supabase/setup.sql` 전체를 붙여넣고 **Run**을 누릅니다. 테이블·개인 자료 권한·비공개 파일 버킷이 생성됩니다.
3. 프로젝트의 **Connect / API Keys**에서 다음 두 값을 복사해 둡니다.

| Vercel에 넣을 이름 | Supabase에서 가져올 값 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (`https://…supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`) |

이 프로젝트는 `service_role` 또는 Secret key를 사용하지 않습니다. Publishable key 대신 비밀키를 넣지 마세요.

## 2. 멤버 로그인용 이메일 발송 설정

로그인은 이메일 인증 코드 방식입니다. 비밀번호 없이 메일에 받은 코드를 입력하면 로그인합니다.

1. Supabase **Authentication → Email / SMTP**에서 메일 발송 서비스의 SMTP 설정을 연결합니다. SMTP 제공자의 Host, Port, User, Password, Sender를 해당 설정 화면에 입력합니다. SMTP 비밀번호는 소스나 GitHub에 올리지 않습니다.
2. **Email Templates**의 **Magic Link**와 **Confirm signup** 양쪽 본문을 아래와 같이 바꿉니다. 처음 가입하는 사람과 기존 계정에 각각 다른 템플릿이 사용될 수 있으므로 둘 다 설정합니다.

```html
<h2>씬룸 로그인 인증 코드</h2>
<p>로그인 화면에 아래 코드를 입력해 주세요.</p>
<p style="font-size:28px;font-weight:bold">{{ .Token }}</p>
<p>요청하지 않았다면 이 메일을 무시해 주세요.</p>
```

3. Email provider와 새 계정 가입을 활성화합니다. 이메일 확인 기능은 유지합니다.

**실제 멤버에게 공유하기 전에 SMTP 설정이 필요합니다.** Supabase 기본 메일 서버는 프로젝트 팀에 등록된 이메일로만 발송하며 일반 멤버들에게는 인증 메일을 보내지 못합니다. 기본 서버는 운영용이 아닙니다.

공식 안내: https://supabase.com/docs/guides/auth/auth-smtp

## 3. GitHub에 올리기

1. https://github.com/new 에서 저장소를 만듭니다. 이름 예: `scene-room`. **Private**로 만들어도 Vercel에서 배포할 수 있습니다.
2. 배포용 ZIP을 압축 해제합니다. `scene-room-vercel` 폴더 안의 **파일과 폴더 전체**를 GitHub 저장소에 올립니다.
3. 저장소 화면에서 **Add file → Upload files**를 사용합니다. `app`, `lib`, `public`, `supabase`, `tests` 폴더와 `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `proxy.ts`, `vercel.json`, `README.md`, `DEPLOY.md`가 포함되어야 합니다.
4. 저장소 첫 화면에 `package.json`이 바로 보여야 합니다. ZIP 파일 하나만 올리면 배포되지 않습니다. `node_modules`, `.next`, `.env.local`은 올리지 않습니다.

터미널을 사용할 수 있다면 이 폴더에서 다음 명령으로 업로드할 수도 있습니다. `본인아이디`와 저장소 이름은 실제 값으로 바꿉니다.

```sh
git init
git add .
git commit -m "Prepare Scene Room for Vercel"
git branch -M main
git remote add origin https://github.com/본인아이디/scene-room.git
git push -u origin main
```

GitHub에서 로그인·권한 승인을 직접 진행합니다. 배포용 코드에는 GitHub 비밀번호나 토큰이 필요하지 않습니다.

## 4. Vercel에 연결하기

1. https://vercel.com/new 에서 GitHub를 연결하고 방금 만든 저장소를 **Import**합니다.
2. Framework는 **Next.js**입니다. 저장소 루트에 `package.json`을 올렸다면 Root Directory는 기본값을 유지합니다. 폴더 안에 올렸다면 `scene-room-vercel`을 Root Directory로 선택합니다.
3. **Environment Variables**에 위의 두 환경 변수를 추가합니다. Production에 적용합니다. Preview 배포도 사용할 경우 Preview에도 추가합니다.
4. **Deploy**를 누릅니다. 성공하면 Vercel 프로젝트의 Production URL (`https://…vercel.app`)을 복사합니다.

환경 변수를 게시 후 변경했다면 Redeploy를 실행해야 새 값이 적용됩니다. 빌드 명령은 `npm run build`, 설치 명령은 `npm ci`이며 Next.js 기본 Output 설정을 사용합니다.

공식 안내: https://vercel.com/docs/git / https://vercel.com/docs/environment-variables/managing-environment-variables

## 5. 마지막 연결과 공유

1. Supabase **Authentication → URL Configuration**의 **Site URL**을 Vercel Production URL로 설정합니다.
2. **Redirect URLs**에 `https://실제주소.vercel.app/auth/callback`과 `https://실제주소.vercel.app/auth/confirm`을 추가합니다. 로컬 테스트에는 `http://localhost:3000/auth/callback`도 추가합니다.
3. Vercel이 Deployment Protection으로 로그인 화면을 보여준다면, 실제 공유할 Production 배포의 접근 설정을 공개로 조정합니다. Preview 링크 대신 Production URL을 공유합니다.
4. 서로 다른 두 이메일로 로그인합니다. 각자 프로필을 만든 뒤 한 계정의 비공개 작품이 다른 계정에 보이지 않는지 확인합니다. ‘스터디 공유’로 바꾸면 다른 계정의 작품 목록에 나타나야 합니다.
5. 자료 업로드·다운로드, 합평 댓글, 단체 목표와 규칙 수정도 확인한 후 **Production URL을 멤버들에게 보내면 됩니다.**

## 오류가 나면

| 증상 | 확인할 것 |
| --- | --- |
| 연결 설정을 준비 중이라고 표시됨 | Vercel의 환경 변수 이름·값·적용 환경, 설정 후 Redeploy |
| 인증 메일 발송 실패 | Custom SMTP, 가입 활성화, 메일 서비스 설정 및 발송 제한 |
| 코드를 넣어도 로그인되지 않음 | Magic Link와 Confirm signup 템플릿 양쪽에 `{{ .Token }}` 적용, 새 코드 요청 |
| 로그인되지만 저장 실패 | SQL Editor에서 `setup.sql` 전체 실행, Supabase 프로젝트 일치 여부 |
| 파일 업로드 실패 | `study-files` 버킷과 정책 생성 여부, 10MB 제한 |
| Vercel 빌드 실패 | 저장소 루트에 `package.json`과 `package-lock.json` 존재 여부, Next.js Framework |
| 공유 링크에서 Vercel 로그인 요구 | Production URL인지 확인, 해당 Production의 Deployment Protection 설정 |

## 확인 범위

로컬 프로덕션 빌드와 데이터베이스 권한 검사를 완료했습니다. 아직 사용자 계정의 GitHub 업로드·Vercel 연결·Supabase 프로젝트 설정은 하지 않았으므로 현재 ZIP 자체는 게시된 사이트가 아닙니다. 실제 프로젝트의 이메일 발송 및 세션 동작은 설정 후 확인해야 합니다.
