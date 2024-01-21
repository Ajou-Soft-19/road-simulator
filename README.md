# 테스트 방법

## 1. 테스트 환경 설치

```bash
npm i
```

명령어 실행

## 2. .env 파일 생성

```bash
TOKEN=[TOKEN_VALUE]
URL=[http://localhost 등 서버 hostname]

CENTER_LATITUDE=37.351855 => 기준 위도
CENTER_LONGITUDE=127.105333 => 기준 경도
RADIUS_IN_KM=5 => 기준점 기준 반경
MIN_DISTANCE=2000 => 생성할 경로의 최소 길이
TEST_CASE_COUNT=100 => 생성할 테스트 케이스 수
BASE_SPEED=30 => 기준 속도, 기준 속도를 기준으로 사인 파형으로 속도를 생성
```

- 중심점을 기준으로 설정한 반경 내에서 무작위로 시작점, 출발점을 생성하고, 출발점과 도착점 사이의 거리가 최소 길이보다 큰 경로를 생성

- 토큰은 Bearer 없이 토큰만 입력

## 3. 테스트 케이스 생성

```bash
npm run init
```

```bash
npm run sim
```
