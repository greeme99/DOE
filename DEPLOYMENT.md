# DOE Auto 배포 가이드

본 가이드는 DOE Auto 애플리케이션의 프론트엔드와 백엔드를 클라우드 환경에 배포하는 방법을 안내합니다.

## 1. 전제 조건

- [Supabase](https://supabase.com) 프로젝트 생성 및 URL, API Key 확보
- GitHub 계정 (소스 코드 호스팅)

## 2. 프론트엔드 배포 (Vercel / Netlify 추천)

프론트엔드는 정적 파일로 빌드되어 배포됩니다.

1. `app/.env` 파일을 확인하여 아래 변수가 설정되어 있는지 확인합니다.

   ```env
   VITE_SUPABASE_URL=당신의_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY=당신의_SUPABASE_ANON_KEY
   VITE_API_URL=배포된_백엔드_API_URL (예: https://doe-api.render.com)
   ```

2. 배포 서비스(Vercel 등)에서 프로젝트를 연결합니다.
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. 위 환경 변수를 Vercel 대시보드의 **Environment Variables** 섹션에 입력합니다.

## 3. 백엔드 배포 (Render / Fly.io 추천)

백엔드는 Python FastAPI 기반으로 실행됩니다.

1. **Render.com** 등의 서비스에서 'Web Service'를 생성합니다.
2. Build Command: `pip install -r requirements.txt`
3. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. **Environment Variables** 설정:

   ```env
   SUPABASE_URL=당신의_SUPABASE_URL
   SUPABASE_SERVICE_KEY=당신의_SUPABASE_SERVICE_ROLE_KEY
   ALLOWED_ORIGINS=배포된_프론트엔드_URL (예: https://doe-app.vercel.app)
   ```

## 4. 데이터베이스 및 보안 (Supabase)

1. **SQL Editor**에서 제공된 `schema.sql`을 실행하여 테이블을 생성합니다.
2. **Authentication** 설정에서 사이트 URL을 배포된 프론트엔드 주소로 업데이트합니다.
3. **RLS(Row Level Security)** 정책이 활성화되어 있는지 확인합니다.

## 5. 로컬 테스트 (배포 전 확인)

배포 전 로컬에서 최종 확인을 원하시면 아래 명령어를 사용하세요.

- **Backend**: `uvicorn main:app --reload` (backend 폴더에서)
- **Frontend**: `npm run dev` (app 폴더에서)
