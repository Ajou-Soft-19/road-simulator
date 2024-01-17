let trafficLights = null;
const fs = require('fs');

fs.readFile('./data/traffic_lights.json', 'utf8', (err, jsonString) => {
  if (err) {
    console.log("Error reading file from disk:", err);
    return;
  }
  try {
    const data = JSON.parse(jsonString);
    trafficLights = data;
  } catch(err) {
    console.log('Error parsing JSON string:', err);
  }
});

const directionsOrder = ['north', 'east', 'south', 'west'];
let currentDirectionIndex = 0;

// 신호등 상태 변경 함수
function toggleTrafficLightState() {
  for (let i = 0; i < trafficLights.length; i++) {
    // 현재 green인 방향을 찾기
    const currentGreenDirection = directionsOrder.find(direction => trafficLights[i].directions[direction] === 'green');

    // 모든 방향의 신호를 빨간색으로 설정
    for (const direction in trafficLights[i].directions) {
        trafficLights[i].directions[direction] = 'red';
    }

    // 현재 green인 방향의 다음 방향을 초록색으로 설정
    const nextDirectionIndex = (directionsOrder.indexOf(currentGreenDirection) + 1) % directionsOrder.length;
    trafficLights[i].directions[directionsOrder[nextDirectionIndex]] = 'green';
  }

  // 변경된 상태를 파일에 저장
  fs.writeFile('./data/traffic_lights.json', JSON.stringify(trafficLights, null, 2), err => {
    if (err) {
      console.log('Error writing file', err);
    }
  });
  console.log('Traffic light state changed');
}

// 10초마다 신호등 상태 변경
setInterval(toggleTrafficLightState, 10000);