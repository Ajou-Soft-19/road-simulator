const WebSocket = require('ws');
const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);

const token = '';

let pathPointData = null;

fs.readFile('xy_list.json', 'utf8', (err, jsonString) => {
  if (err) {
    console.log("Error reading file from disk:", err);
    return;
  }
  try {
    const data = JSON.parse(jsonString);
    pathPointData = data.pathPoint;
  } catch(err) {
    console.log('Error parsing JSON string:', err);
  }
});

const ws = new WebSocket('ws://localhost:7002/ws/my-location', {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});


// 차량 위치 업데이트 데이터 생성 함수
function createUpdateData(i, pathPointData, totalSeconds, token) {
    const baseSpeed = 30 + 20 * Math.sin(Math.PI * totalSeconds / 60);
    const randomFactor = 1 + (Math.random() - 0.5) / 10;
    const speed = baseSpeed * randomFactor;
    return {
        requestType: "UPDATE",
        jwt: `Bearer ${token}`,
        data: {
            vehicleId: 1,
            longitude: pathPointData[i].location[0],
            latitude: pathPointData[i].location[1],
            isUsingNavi: false,
            meterPerSec: speed / 3.6,
            direction: i > 0 ? calculateBearing(
                pathPointData[i-1].location[1] * Math.PI/180,
                pathPointData[i-1].location[0] * Math.PI/180,
                pathPointData[i].location[1] * Math.PI/180,
                pathPointData[i].location[0] * Math.PI/180
            ) : 0,
            timestamp: new Date().toISOString()
        }
    };
}

// 신호등 상태 확인 및 대기 함수
async function checkTrafficLightsAndWait(pathPointData, i) {
    if (i < pathPointData.length - 1) {
        let trafficLights = await checkTrafficLightState();
        let closestTrafficLight = null;
        let minDistance = Infinity;

        // 1. 다음 위치 좌표가 신호등과 가까워질 때
        // 2. 다음 위치 좌표에서 가장 가까운 신호등 하나를 선정
        for (let j = 0; j < trafficLights.length; j++) {
            const distanceToTrafficLight = calculateDistance(
                pathPointData[i+1].location[1],
                pathPointData[i+1].location[0],
                trafficLights[j].location[1],
                trafficLights[j].location[0]
            );

            if (distanceToTrafficLight < minDistance) {
                minDistance = distanceToTrafficLight;
                closestTrafficLight = trafficLights[j];
            }
        }

        // 3. 선정된 신호등이 빨간불이면 초록불이 될 때까지 기다림
        if (minDistance < 50 && closestTrafficLight.state === 'red') {
            while (closestTrafficLight.state === 'red') {
                console.log('Waiting for green light...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                trafficLights = await checkTrafficLightState(); // 신호등 상태 정보 갱신
                closestTrafficLight = trafficLights.find(light => light.id === closestTrafficLight.id);
            }
        }
    }
}

ws.on('open', async function open() {
    console.log('Connected to the server');

    const init_data = {
        requestType: "INIT",
        jwt: `Bearer ${token}`,
        data: {
            vehicleId: 1,
        }
    };

    ws.send(JSON.stringify(init_data));
    try {
        const jsonString = await readFile('xy_list.json', 'utf8');
        const data = JSON.parse(jsonString);
        const pathPointData = data.pathPoint;
        let totalSeconds = 0;

        for (let i = 0; i < pathPointData.length; i++) {
            const updateData = createUpdateData(i, pathPointData, totalSeconds, token);
            await checkTrafficLightsAndWait(pathPointData, i);
            ws.send(JSON.stringify(updateData));
            console.log(`Sent: ${JSON.stringify(updateData)}`);

            if (i < pathPointData.length - 1) {
                const distance = calculateDistance(
                    pathPointData[i].location[1],
                    pathPointData[i].location[0],
                    pathPointData[i+1].location[1],
                    pathPointData[i+1].location[0]
                );
                const time = distance / (updateData.data.meterPerSec);
                totalSeconds += time;
                await new Promise(resolve => setTimeout(resolve, time * 1000));
            }
        }
        ws.close();
    } catch(err) {
        console.log('Error:', err);
    }
});

ws.on('message', function incoming(data) {
  console.log(`Received: ${data}`);
});

ws.on('close', function close() {
  console.log('Connection closed');
});

ws.on('error', function error(err) {
  console.error(err);
});



async function checkTrafficLightState() {
  let trafficLights = null;
  try {
    const jsonString = await readFile('traffic_lights.json', 'utf8');
    const data = JSON.parse(jsonString);
    trafficLights = data;
  } catch(err) {
    console.log('Error:', err);
  }

  return trafficLights;
}

async function checkTrafficLightState() {
    let trafficLights = null;
    try {
        const jsonString = await readFile('traffic_lights.json', 'utf8');
        const data = JSON.parse(jsonString);
        trafficLights = data;
    } catch(err) {
        console.log('Error:', err);
    }

    return trafficLights;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
}

function calculateBearing(lat1, lon1, lat2, lon2) {
    const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360; 
    return bearing;
}