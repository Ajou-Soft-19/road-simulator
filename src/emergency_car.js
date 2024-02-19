const WebSocket = require('ws');
const axios = require('axios');
const fs = require('fs').promises;
require('dotenv').config();

const servie_server = process.env.SERVICE_URL;
const socket_url = process.env.SOCKET_URL;
const login_url = process.env.LOGIN_URL;
const emergencyVehicleCount = process.env.EMERGENCY_VEHICLE_COUNT;
var config = {};
var accessToken = '';

async function createWebSocket(vehicleId, startLocation, endLocation) {
    const pathRes = await axios.post(`${servie_server}/api/emergency/navi/route`, {
        "source": startLocation.join(','),
        "dest": endLocation.join(','),
        "options": "",
        "provider": "OSRM",
        "vehicleId": vehicleId
    }, config).catch(e => console.log(e));

    if(pathRes.status != 200) {
        console.error(`[Emergency] Failed to get pathPoint for vehicle ${jsonData.vehicleId}: ${pathRes.data.code}`);
        return;
    }

    const ws = new WebSocket(`${socket_url}/ws/emergency-location`, config);

    ws.on('open', function() {
        startEmergencyEvent(ws, vehicleId, pathRes);
    });

    ws.on('message', function incoming(data) {
        const receivedData = JSON.parse(data);
        if (receivedData.data && receivedData.data.msg !== 'OK') {
            console.log(`[Emergency] Received: ${data}`);
        }

        if(receivedData.data.code === 420) {
            console.log('[Emergency] Not Inited', receivedData.data.msg);
        }
    });

    ws.on('close', async function close() {
        console.log(`[Emergency] Connection closed`);
        const res = await axios.post(`${servie_server}/api/emergency/event/end`, {
            "emergencyEventId": emergencyEventId,
        }, config).catch(e => console.log(e.response.data.data));

        if(res.status != 200) {
            console.error(`[Emergency] Failed to end emergency event ${res.data.code}`);
            return;
        }
    });

    ws.on('error', function error(err) {
        console.error(err);
    });
}

async function startEmergencyEvent(ws, vehicleId, pathRes) {
    console.log('[Emergency] Connected to the server');

    const pathData = pathRes.data.data;
    const naviPathId = pathData.naviPathId;
    const init_data = {
        requestType: "INIT",
        jwt: `Bearer ${accessToken}`,
        data: {
            vehicleId: vehicleId,
        }
    };

    const eventRes = await axios.post(`${servie_server}/api/emergency/event/register`, {
        "navigationPathId": pathData.naviPathId,
        "vehicleId": vehicleId
    }, config).catch(e => console.log(e.response.data.data));

    if(eventRes.status != 200) {
        console.error(`[Emergency] Failed to register emergency path ${jsonData.vehicleId}: ${pathRes.data.code}`);
        return;
    }

    emergencyEventId = eventRes.data.data.emergencyEventId;
    ws.send(JSON.stringify(init_data));

    try { 
        const pathPointData = pathData.pathPoint;
        const baseSpeed = pathData.distance / pathData.duration;
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
                    
                    const updateData = createUpdateData(naviPathId, emergencyEventId, i, pathPointData, segmentPoints[j], vehicleId, baseSpeed);

                    if (accumulatedTime >= 1) {
                        ws.send(JSON.stringify(updateData));
                        await new Promise(resolve => setTimeout(resolve, accumulatedTime * 1000));
                        accumulatedTime = 0;
                    }
                }
            }
        }
        ws.close();
        console.log(`[Emergency] Total time: ${totalSeconds} seconds`);
    } catch(err) {
        console.log('[Emergency] Error:', err);
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
function createUpdateData(naviPathId, emergencyEventId, i, pathPointData, point, vehicleId, baseSpeed) {
    const randomFactor = 1 + (Math.random() - 0.5) / 10;
    const speed = baseSpeed * randomFactor + 5;
    const randomError = (Math.random() * 0.00009) - 0.000045;

    return {
        requestType: "UPDATE",
        data: {
            vehicleId: vehicleId,
            longitude: point[0] + randomError,
            latitude: point[1] + randomError,
            isUsingNavi: true,
            naviPathId: naviPathId,
            emergencyEventId: emergencyEventId,
            onEmergencyEvent: true,
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

async function getAccessToken(configData) {
    const res = await axios.post(`${login_url}/api/account/auth`, {
        "loginType": "EMAIL_PW",
        "email": configData.id,
        "password": configData.pw
    }).catch(e => console.log(e.response.data.data));

    if(res.status != 200) {
        console.error(`[Emergency] Failed to get access token ${res.data.code}`);
        return;
    }

    return res.data.data.accessToken;
}

async function startEmergencyVehicles() {
    const jsonString = await fs.readFile('./data/emergency_info.json', 'utf8');
    const configData = JSON.parse(jsonString);

    accessToken = await getAccessToken(configData);
    console.log(`[Emergency] Successfully got access token`);
    
    config = {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    };

    console.log(`[Emergency] Start emergency vehicles`);
    for (i = 0; i < emergencyVehicleCount; i++) {
        const vehicle = configData.vehicleInfos[i];
        const location = configData.locations[i];
        if(vehicle === undefined || location === undefined) {
            console.error(`[Emergency] No location data for vehicle ${vehicle.vehicleId}`);
            continue;
        }
        createWebSocket(vehicle.vehicleId, location.startLocation, location.endLocation);
    }
}

exports.startEmergencyVehicles = startEmergencyVehicles;