# 🌊 RecomMusic (Ambient YouTube Player)

**RecomMusic**은 복잡한 화면 없이 음악 감상과 작업에만 온전히 집중할 수 있도록 제작된 미니멀하고 감성적인 웹 기반 유튜브 뮤직 플레이어입니다. 단순한 플레이어를 넘어, **3가지 감성 모드(Focus, Gaming, Mix)**와 **백색소음 믹서(Ambient Mixer)**, 그리고 작업 효율을 높여주는 **경험치(XP) 기반의 뽀모도로(잠금화면) 시스템**을 제공합니다.

---

## ✨ 주요 기능

### 1. 🎨 3가지 맞춤형 감성 테마 (Modes)
작업 환경이나 기분에 맞춰 클릭 한 번으로 UI 테마와 백그라운드 입자(Particle) 효과가 변경됩니다.
*   🎯 **집중 모드 (Focus)**: 포근하고 따뜻한 색감과 함께, 모닥불 감성의 **반딧불이(Fireflies)**가 화면 아래에서 위로 은은하게 떠오릅니다.
*   🎮 **게이밍 모드 (Gaming)**: 사이버펑크 감성의 네온 컬러와 함께, 화면을 가로지르는 **정열적인 불티(Embers/Sparks)**가 몰입감을 극대화합니다.
*   ☕ **믹스 모드 (Mix)**: 심해의 잔잔한 파도(Canvas Waves)와 함께 **부드러운 하얀 눈(Snow)**이 흩날리는 기본 모드입니다.

### 2. 🎚️ 사운드 믹서 (Ambient Sound Mixer)
음악만으로 부족할 때, 마음을 편안하게 해주는 3가지 백색소음을 유튜브 음악과 함께 믹스(Mix)하여 재생할 수 있습니다.
*   🌧️ **빗소리 (Rain)** / 🔥 **모닥불 소리 (Fire)** / 🍃 **바람 소리 (Wind)**
*   각각의 소리를 켜고 끌 수 있으며, 개별 볼륨 조절 슬라이더를 지원하여 나만의 완벽한 앰비언트 사운드를 만들 수 있습니다.

### 3. 🔒 뽀모도로 잠금 화면 & 경험치(XP) 시스템
작업에 깊게 몰입할 수 있도록 돕는 게임화(Gamification) 타이머 기능입니다.
*   **잠금 화면 진입**: 집중 모드에서 `[잠금 화면]` 버튼을 누르면 유리 질감의 감성적인 잠금 화면(Lock Screen)과 모닥불 애니메이션(불멍)이 나타납니다.
*   **경험치(XP) 획득**: 잠금 화면을 유지하는 동안 타이머가 흘러가며, 일정 시간마다 게이지가 차오르고 **레벨(LV)**이 상승합니다!
*   (메이플스토리 감성의 경험치 바 UI 적용)

### 4. 🔍 인앱 유사 곡 추천 (In-App Search)
*   새 창을 띄울 필요 없이 **`[✨ 비슷한 곡 찾기]`** 버튼 하나로 현재 듣고 있는 곡과 유사한 분위기의 곡 4개를 사이트 내에서 즉시 추천받습니다.
*   자체 구축된 로컬 API(`yt-search` + Vite Proxy)를 사용하여 유튜브 API 키 없이도 동작합니다.

### 5. ⚡ 저사양 PC를 위한 '극한의 최적화' (Extreme Optimization)
램이 4GB에 불과하거나 내장 그래픽을 사용하는 구형 노트북에서도 부드럽게 동작하도록 프레임워크 수준의 최적화를 적용했습니다.
*   **GPU 블러 제거**: 렌더링 부하가 심한 CSS `backdrop-filter: blur`를 제거하고 고급스러운 반투명 단색(`rgba`)으로 대체했습니다.
*   **Canvas 연산 0점대 수렴**: 복잡한 `shadowBlur` 계산 대신 가벼운 이중 원(Arc) 그리기로 빛나는(Glow) 효과를 완벽하게 모방했습니다.
*   **30 FPS 캡핑**: 애니메이션 루프(`requestAnimationFrame`)를 초당 30프레임으로 강제 제한하여 CPU 점유율과 발열, 배터리 소모를 극적으로 낮췄습니다.

---

## 🛠️ 기술 스택

*   **Frontend**: HTML5, Vanilla JavaScript, CSS3, HTML Canvas API
*   **Backend/Build**: Vite, Node.js (커스텀 로컬 API 미들웨어 구성)
*   **Data Fetching**: `yt-search` (유튜브 검색 크롤링), YouTube IFrame Player API

---

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
*Built with ❤️ for a personal ambient music & focus experience.*
