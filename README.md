# webplayer

탑다운 2D 실시간 액션 RPG — 웹 브라우저 및 Android WebView 배포를 위한 모노레포.

## 기술 스택

- **게임**: Phaser.js 3.x + TypeScript + Vite
- **Android**: Kotlin + WebView 래퍼
- **맵 에디터**: Tiled Map Editor (32×32px 타일)

## 프로젝트 구조

```
webplayer/
├── web/          # Phaser.js 웹 게임 (메인 코드베이스)
├── android/      # WebView 래퍼 Android 앱 (Kotlin)
├── design/       # 디자인 에셋 원본 (스프라이트, UI, 컨셉아트)
├── docs/         # 기획 문서, 데이터 스키마, 스토리
└── README.md
```

## 빠른 시작

```bash
# 웹 게임 개발 서버 실행
cd web
npm install
npm run dev
```

## 문서

- [게임 설계 문서 (GDD)](docs/GDD.md)
- [설계 스펙](docs/superpowers/specs/2026-04-20-webgame-rpg-design.md)
