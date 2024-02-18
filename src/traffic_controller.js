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

// 신호등 상태 변경 함수
function toggleTrafficLightState() {
  for (let i = 0; i < trafficLights.length; i++) {
    const currentGreenDirection = Object.keys(trafficLights[i].directions).find(direction => trafficLights[i].directions[direction] === 'green');

    for (const direction in trafficLights[i].directions) {
        trafficLights[i].directions[direction] = 'red';
    }

    const directions = Object.keys(trafficLights[i].directions);
    const nextDirectionIndex = (directions.indexOf(currentGreenDirection) + 1) % directions.length;
    trafficLights[i].directions[directions[nextDirectionIndex]] = 'green';
  }

  fs.writeFile('./data/traffic_lights.json', JSON.stringify(trafficLights, null, 2), err => {
    if (err) {
      console.log('Error writing file', err);
    }
  });
  console.log('Traffic light state changed');
}

function turnTrafficControllerOn() {
  setInterval(toggleTrafficLightState, 20000);
}

exports.turnTrafficControllerOn = turnTrafficControllerOn;