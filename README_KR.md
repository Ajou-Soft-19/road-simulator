# 도로 네트워크 시뮬레이션

## 1. 테스트 환경 설치

```bash
npm i
```

의존성 설치를 위해 `git clone` 후 해당 디렉토리에서 위 명령어를 실행합니다.

## 2. .env 파일 생성 또는 수정

```bash
LOGIN_URL=https://ajou-epas.xyz:7000
SERVICE_URL=https://ajou-epas.xyz:7001
SOCKET_URL=wss://ajou-epas.xyz:7002

CENTER_LATITUDE=37.351855 => 기준 위도
CENTER_LONGITUDE=127.105333 => 기준 경도
RADIUS_IN_KM=3 => 기준점 기준 반경
MIN_DISTANCE=1000 => 생성할 경로의 최소 길이
ORDINARY_VEHICLE_COUNT=10 => 일반 차량의 수
EMERGENCY_VEHICLE_COUNT=2 => 응급 차량의 수
```

- 중심점을 기준으로 설정한 반경 내에서 무작위로 시작점, 출발점을 생성하고, 출발점과 도착점 사이의 거리가 최소 길이보다 큰 경로를 생성합니다.
- 일반 차량과 응급 차량의 수를 설정할 수 있습니다.
- 아래 `.env` 파일을 통해 생성할 `npm run init`에서 생성할 테스트를 조절할 수 있습니다.

## 3. 테스트 케이스 생성

```bash
npm run init
```

- 시뮬레이션 수행을 위해 테스트 케이스를 생성합니다.
- 일반 차량의 경우 `./data/pahts` 폴더에 `xy_list_숫자.json` 형식으로 저장됩니다.
- 응급 차량의 경우 `./data/emergency_info.json`에 저장됩니다. 응급차량의 경우 차량을 계정에 등록된 차량이 부족한 경우 자동으로 차량을 등록하고 저장합니다.
- **이때 응급차량의 출발지와 시작지는 자동으로 선택되지 않아 직접 선택해야 합니다.**

emergency_info.json의 형식은 다음과 같습니다. 테스트 수행을 위해 아래와 같이 설정해두었습니다.

```json
{
  "id": "ajouepas@ajou.ac.kr",
  "pw": "ajouepas1234!?",
  "vehicleInfos": [
    {
      "vehicleId": 27,
      "vehicleType": "FIRE_TRUCK_MEDIUM",
      "licenceNumber": "947Y1201"
    }
  ],
  "locations": [
    {
      "startLocation": [127.105985, 37.342602],
      "endLocation": [127.122909, 37.352029]
    }
  ]
}
```

- `ajouepas@ajou.ac.kr`는 응급차량 권한이 있는 계정입니다.
- 이 계정을 사용하여 테스트를 수행하기 위해 응급차량을 등록할 수 있습니다.

## 4. 신호등 데이터 설정

신호등 데이터는 `./data/traffic_lights.json`에 저장됩니다.

```json
[
  {
    "location": [127.106012, 37.353433],
    "directions": {
      "0": "green",
      "90": "red",
      "180": "red",
      "270": "red"
    }
  },
  {
    "location": [127.108994, 37.345825],
    "directions": {
      "0": "red",
      "90": "red",
      "180": "red",
      "270": "green"
    }
  }
]
```

- `location`은 신호등의 위치를 나타내며, `directions`는 신호등의 방향을 나타냅니다.
- `directions`의 키는 각 방향을 나타내며, 값은 `green` 또는 `red`로 신호등의 상태를 나타냅니다.
- 예시로 어떤 차량이 정북 방향으로 주행 중이라면 `0`에 해당하는 신호등의 상태를 확인합니다.
- 교차로의 좌표와 방향을 확인하여 신호등 데이터를 설정합니다. 각도는 30도 단위로 설정합니다.
- `traffic_controller.js` 파일에서 20초마다 신호등의 상태를 업데이트합니다.

## 4. 시뮬레이션 실행

```bash
npm run sim
```

- 일반 차량, 응급 차량, 신호등 모두 시뮬레이션을 시작합니다.
- 시뮬레이션은 `EPSA`앱의 모니터링 페이지를 통해 시각적으로 확인할 수 있습니다.

<div align="center">
    <img src="https://github.com/Ajou-Soft-19/road-simulator/assets/32717522/ade13bb5-91ff-47ae-8567-16cff7a2908d" width="500">
</div>

- 위는 [EPAS](https://github.com/Ajou-Soft-19/service-app)앱을 통해 시각화한 시뮬레이션 영상입니다.

```bash
npm run traffic
```

- 신호등 시뮬레이션을 시작합니다.

```bash
npm run emergency
```

- 응급 차량 시뮬레이션을 시작합니다.

```bash
npm run dummy
```

- 일반 차량 시뮬레이션을 시작합니다.

## 5. 시뮬레이션 종료

- 시뮬레이션은 응급 차량 시뮬레이션이 종료되면 자동으로 종료됩니다.
- 시뮬레이션 도중 테스트를 종료하려면 윈도우의 경우 `Ctrl + C`를 누릅니다.

## 6. 테스트 케이스 제거

```bash
npm run clean
```

- 생성된 테스트 케이스를 제거합니다.
- 일반 차량의 데이터만 제거됩니다. 응급 차량의 데이터는 수동으로 제거해야 합니다.
