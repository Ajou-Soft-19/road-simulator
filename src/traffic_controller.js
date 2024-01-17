let trafficLights = null;
const fs = require('fs');

fs.readFile('traffic_lights.json', 'utf8', (err, jsonString) => {
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

// 신호등 상태 변경 함수
function toggleTrafficLightState() {
  for (let i = 0; i < trafficLights.length; i++) {
    trafficLights[i].state = trafficLights[i].state === 'red' ? 'green' : 'red';
  }
  // 변경된 상태를 파일에 저장
  fs.writeFile('traffic_lights.json', JSON.stringify(trafficLights, null, 2), err => {
    if (err) {
      console.log('Error writing file', err);
    }
  });
  console.log('Traffic light state changed');
}

// 10초마다 신호등 상태 변경
setInterval(toggleTrafficLightState, 20000);