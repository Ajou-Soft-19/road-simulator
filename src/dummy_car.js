const WebSocket = require('ws');
const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
require('dotenv').config();

const token = process.env.TOKEN;

function createWebSocket(fileName) {
    const ws = new WebSocket('ws://localhost:7002/ws/my-location', {
    headers: {
        Authorization: `Bearer ${token}`,
        },
    });
    console.log(fileName);

    ws.on('open', async function open() {
        console.log('Connected to the server');
        const jsonString = await readFile(`./data/${fileName}`, 'utf8');
        
        const data = JSON.parse(jsonString);
        const init_data = {
            requestType: "INIT",
            jwt: `Bearer ${token}`,
            data: {
                vehicleId: data.vehicleId,
            }
        };

        ws.send(JSON.stringify(init_data));

        try { 
            const pathPointData = data.pathPoint;
            const baseSpeed = data.distance / data.duration;
            let totalSeconds = 0;
            for (let i = 0; i < pathPointData.length; i++) {
                const updateData = createUpdateData(i, pathPointData, totalSeconds, token, data.vehicleId, baseSpeed);
                await checkTrafficLightsAndWait(pathPointData, i, ws);
                ws.send(JSON.stringify(updateData));

                console.log(`vehicleId: ${data.vehicleId} (${i}/${pathPointData.length})`);
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
            console.log(`Total time: ${totalSeconds} seconds`);
        } catch(err) {
            console.log('Error:', err);
        }
    });

    ws.on('message', function incoming(data) {
        const receivedData = JSON.parse(data);
        if (receivedData.data && receivedData.data.msg !== 'OK') {
            console.log(`Received: ${data}`);
        }

        if(receivedData.data.code === 420) {
            console.log('Not Inited', receivedData.data.msg);
        }
    });

    ws.on('close', function close() {
        console.log(`Connection closed`);
    });

    ws.on('error', function error(err) {
        console.error(err);
    });
}

// 차량 위치 업데이트 데이터 생성 함수
function createUpdateData(i, pathPointData, totalSeconds, token, vehicleId, baseSpeed) {
    // const baseSpeed = parseFloat(process.env.BASE_SPEED) + 20 * Math.sin(Math.PI * totalSeconds / 60);
    const randomFactor = 1 + (Math.random() - 0.5) / 10;
    const speed = baseSpeed * randomFactor;
    return {
        requestType: "UPDATE",
        jwt: `Bearer ${token}`,
        data: {
            vehicleId: vehicleId,
            longitude: pathPointData[i].location[0],
            latitude: pathPointData[i].location[1],
            isUsingNavi: false,
            meterPerSec: speed,
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

async function checkTrafficLightState() {
    let trafficLights = null;
    try {
        const jsonString = await readFile('./data/traffic_lights.json', 'utf8');
        const data = JSON.parse(jsonString);
        trafficLights = data;
    } catch(err) {
        console.log('Error:', err);
    }

    return trafficLights;
}

// 신호등 상태 확인 및 대기 함수
async function checkTrafficLightsAndWait(pathPointData, i) {
    if(i >= pathPointData.length - 1) return ;

    let trafficLights = await checkTrafficLightState();
    let closestTrafficLight = null;
    let minDistance = Infinity;

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

    const distanceToNextLocation = calculateDistance(
        pathPointData[i+1].location[1],
        pathPointData[i+1].location[0],
        closestTrafficLight.location[1],
        closestTrafficLight.location[0]
    );

   if(distanceToNextLocation > minDistance) {
      return ;
    }

    // 신호등 선정, 30도 간격으로 계산
    let direction = calculateDirection(pathPointData[i].location, pathPointData[i+1].location);

    // 신호등이 없을 경우 가장 가까운 방향의 신호등 설정
    if (!closestTrafficLight.directions.hasOwnProperty(direction)) {
        direction = findClosestDirection(closestTrafficLight.directions, direction);
    }

    if (minDistance < 50 && closestTrafficLight.directions[direction] === 'red') {
        while (closestTrafficLight.directions[direction] === 'red') {
            console.log(`Waiting for green light at ${closestTrafficLight.location} in the ${direction} direction.`);
            await new Promise(resolve => setTimeout(resolve, 4000));
            trafficLights = await checkTrafficLightState();
            closestTrafficLight = trafficLights.find(light => light.id === closestTrafficLight.id);
        }
    } 
}

// 방향 계산
function findClosestDirection(directions, targetDirection) {
  let closestDirection = null;
  let minDifference = Infinity;
  
  for (const direction in directions) {
    const difference = Math.abs(direction - targetDirection);
    if (difference < minDifference) {
      minDifference = difference;
      closestDirection = direction;
    }
  }
  
  return closestDirection;
}

function calculateDirection(location1, location2) {
    return calculateBearing(
        location1[1] * Math.PI / 180,
        location1[0] * Math.PI / 180,
        location2[1] * Math.PI / 180,
        location2[0] * Math.PI / 180
    );
}

function calculateBearing(lat1, lon1, lat2, lon2) {
    const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360; 
    return bearing;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; 
  const φ1 = lat1 * Math.PI/180; 
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

async function main() {
  fs.readdir('./data', function(err, fileNames) {
    if (err) {
      console.error("Failed to read directory: " + err);
      return;
    }

    const filteredFileNames = fileNames.filter(fileName => fileName.startsWith('xy_list_') && fileName.endsWith('.json'));

    filteredFileNames.forEach(createWebSocket);
  });
}

main().catch(console.error);