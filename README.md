# 🌊 RecomMusic (Ambient YouTube Player)

**RecomMusic**은 복잡한 화면 없이 음악 감상에만 온전히 집중할 수 있도록 제작된 미니멀하고 감성적인 웹 기반 유튜브 뮤직 플레이어입니다. 
마치 심해에서 잔잔한 파도가 일렁이는 듯한 청량하고 다크한 감성(Deep Dark Ocean)을 테마로 디자인되었습니다.

## ✨ 주요 기능

*   **🌊 감성적인 물결 배경 (Canvas Waves)**: 노래방 기계 같은 이퀄라이저나 시끄러운 유튜브 영상 대신, 마음이 편안해지는 푸른빛의 잔잔한 파도 애니메이션이 백그라운드에 흐릅니다. 
*   **🎧 미니멀 플레이리스트**: 듣고 싶은 유튜브 링크를 넣으면 플레이리스트에 바로 등록되며, `localStorage`를 통해 브라우저를 껐다 켜도 목록이 그대로 유지됩니다.
*   **🔍 인앱 비슷한 곡 추천 (In-App Search)**:
    *   새 창을 띄울 필요 없이 **`[✨ 비슷한 곡 찾기]`** 버튼 하나로 현재 듣고 있는 곡과 유사한 장르의 곡 4개를 사이트 내에서 즉시 추천해 줍니다.
    *   자체 구축된 로컬 API(`yt-search` + Vite Proxy)를 사용하여 유튜브 API 키 없이도 빠르고 정확하게 검색합니다.
*   **⚡ 직관적인 재생 컨트롤**: 
    *   재생/일시정지 기능은 기본!
    *   1.0x ~ 2.0x 까지 자유로운 **배속 조절** 기능.
    *   앞/뒤 10초 건너뛰기(Rewind/Forward) 및 완전 정지(Stop) 기능 지원.
*   **🔗 원본 보기**: 클릭 한 번으로 원본 유튜브 영상 페이지로 넘어갈 수 있습니다.

## 🛠️ 기술 스택

*   **Frontend**: HTML5, Vanilla JavaScript, CSS3 (Glassmorphism UI)
*   **Backend/Build**: Vite, Node.js (커스텀 로컬 API 미들웨어 구성)
*   **Data Fetching**: `yt-search` (유튜브 검색 크롤링), YouTube IFrame API

## 🚀 로컬 실행 방법

이 프로젝트는 Vite 환경 위에서 실행되며, 커스텀 API를 사용하기 위해 로컬 개발 서버를 구동해야 합니다.

1. **저장소 클론 (Clone Repository)**
   ```bash
   git clone https://github.com/seonghyeon1221/recomMusic.git
   cd recomMusic
   ```

2. **패키지 설치 (Install Dependencies)**
   ```bash
   npm install
   ```

3. **개발 서버 실행 (Start Dev Server)**
   ```bash
   npm run dev
   ```

4. 터미널에 표시된 로컬 주소 (예: `http://localhost:5173/`)로 브라우저에 접속하여 즐기세요!

---
*Built with ❤️ for a personal ambient music experience.*
