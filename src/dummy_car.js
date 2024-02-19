const WebSocket = require('ws');
const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
require('dotenv').config();

const socket_url = process.env.SOCKET_URL;
const testCount = process.env.ORDINARY_VEHICLE_COUNT;

function createWebSocket(fileName) {
    const ws = new WebSocket(`${socket_url}/ws/my-location`);

    ws.on('open', function() {
        open(ws, fileName);
    });

    ws.on('message', function incoming(data) {
        const receivedData = JSON.parse(data);
        if (receivedData.data && receivedData.data.msg !== 'OK' && receivedData.messageType !== 'RESPONSE') {
            console.log(`[Dummy] Received: ${data}`);
        }

        if(receivedData.data.code === 420) {
            console.log('[Dummy] Not Inited', receivedData.data.msg);
        }
    });

    ws.on('close', function close() {
        console.log(`[Dummy] Connection closed`);
    });

    ws.on('error', function error(err) {
        console.error(err);
    });
}

async function open(ws, fileName) {
    const jsonString = await readFile(`./data/paths/${fileName}`, 'utf8');
        
    const data = JSON.parse(jsonString);
    const init_data = {
        requestType: "INIT",
    };

    ws.send(JSON.stringify(init_data));

    try { 
        const pathPointData = data.pathPoint;
        const baseSpeed = data.distance / data.duration;
        let totalSeconds = 0;
        let accumulatedTime = 0; 
        for (let i = 0; i < pathPointData.length; i++) {
            if (i < pathPointData.length - 1) {
                const distance = calculateDistance(
                    pathPointData[i].location[1],
                    pathPointData[i].location[0],
                    pathPointData[i+1].location[1],
                    pathPointData[i+1].location[0]
                );

                // Calculate time to reach next point and interpolate when necessary
                const time = distance / baseSpeed;
                const numOfSegments = Math.max(Math.ceil(time), 1);
                const segmentTime = time / numOfSegments;
                const segmentPoints = interpolate(pathPointData[i].location, pathPointData[i+1].location, numOfSegments, 0, numOfSegments);

                for (let j = 0; j < segmentPoints.length; j++) {
                    totalSeconds += segmentTime;
                    accumulatedTime += segmentTime;

                    const updateData = createUpdateData(i, pathPointData, segmentPoints[j], baseSpeed);

                    if (accumulatedTime >= 1) {
                        await checkTrafficLightsAndWait(pathPointData, i, segmentPoints[j]);
                        ws.send(JSON.stringify(updateData));
                        await new Promise(resolve => setTimeout(resolve, accumulatedTime * 1000));
                        accumulatedTime = 0;
                    }
                }
            }
        }
        ws.close();
        console.log(`[Dummy] Total time: ${totalSeconds} seconds`);
    } catch(err) {
        console.log('[Dummy] Error:', err);
    }
}

function interpolate(start, end, numOfSegments, startIndex, endIndex) {
    const points = [];
    for(let i = startIndex; i <= endIndex; i++) {
        const ratio = i / numOfSegments;
        const lat = start[0] + ratio * (end[0] - start[0]);
        const lon = start[1] + ratio * (end[1] - start[1]);
        points.push([lat, lon]);
    }
    return points;
}

// Create update data for each point
// assum gps data is not accurate, so add some random error about 5m
function createUpdateData(i, pathPointData, point, baseSpeed) {
    const randomFactor = 1 + (Math.random() - 0.5) / 10;
    const speed = baseSpeed * randomFactor;
    const randomError = (Math.random() * 0.0003) - 0.00015;

    return {
        requestType: "UPDATE",
        data: {
            longitude: point[0] + randomError,
            latitude: point[1] + randomError,
            isUsingNavi: false,
            meterPerSec: speed,
            direction: i > 0 ? calculateBearing(
                pathPointData[i].location[1] * Math.PI/180,
                pathPointData[i].location[0] * Math.PI/180,
                point[1] * Math.PI/180,
                point[0] * Math.PI/180 
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
        console.log('[Dummy] Error:', err);
    }

    return trafficLights;
}

// check traffic light state and wait for green light
async function checkTrafficLightsAndWait(pathPointData, i, point) {
    if(i >= pathPointData.length - 1) return ;

    let trafficLights = await checkTrafficLightState();
    let closestTrafficLight = null;
    let minDistance = Infinity;

    for (let j = 0; j < trafficLights.length; j++) {
        const distanceToTrafficLight = calculateDistance(
            point[1],
            point[0],
            trafficLights[j].location[1],
            trafficLights[j].location[0]
        );

        if (distanceToTrafficLight < minDistance) {
            minDistance = distanceToTrafficLight;
            closestTrafficLight = trafficLights[j];
        }
    }

    const distanceToNextLocation = calculateDistance(
         point[1],
            point[0],
        closestTrafficLight.location[1],
        closestTrafficLight.location[0]
    );

   if(distanceToNextLocation > minDistance) {
      return ;
    }

    // set the direction of the traffic light
    let direction = calculateDirection(pathPointData[i].location, pathPointData[i+1].location);

    // if the traffic light does not have the direction, find the closest direction
    if (!closestTrafficLight.directions.hasOwnProperty(direction)) {
        direction = findClosestDirection(closestTrafficLight.directions, direction);
    }

    if (minDistance < 50 && closestTrafficLight.directions[direction] === 'red') {
        while (closestTrafficLight.directions[direction] === 'red') {
            //console.log(`Waiting for green light at ${closestTrafficLight.location} in the ${direction} direction.`);
            await new Promise(resolve => setTimeout(resolve, 4000));
            trafficLights = await checkTrafficLightState();
            closestTrafficLight = trafficLights.find(light => 
                JSON.stringify(light.location) === JSON.stringify(closestTrafficLight.location)
            );
        }
    }
}

// find the closest direction to the target direction
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

async function startDummyVechicles() {
    console.log('[Dummy] Start dummy vehicles');
    fs.readdir('./data/paths', function(err, fileNames) {
        if (err) {
        console.error("[Dummy] Failed to read directory: " + err);
        return;
        }

        const filteredFileNames = fileNames.filter(fileName => fileName.startsWith('xy_list_') && fileName.endsWith('.json'));
        console.log(`[Dummy] Found ${filteredFileNames.length} files`);
        for (let i = 0; i < filteredFileNames.length && i < testCount; i++) {
            const fileName = filteredFileNames[i];
            const match = fileName.match(/xy_list_(\d+)\.json/);
            if (match) {
                createWebSocket(fileName);
            }
        }
    });
}

exports.startDummyVechicles = startDummyVechicles;