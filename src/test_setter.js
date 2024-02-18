const axios = require('axios');
const fs_promises = require('fs').promises;
const fs = require('fs');
require('dotenv').config();

const service_url = process.env.SERVICE_URL;
const login_url = process.env.LOGIN_URL;
var config = {};
var accessToken = '';

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomChar() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return chars.charAt(Math.floor(Math.random() * chars.length));
}

function getRandomVehicleType() {
  const vehicleTypes = ['AMBULANCE', 'FIRE_TRUCK_MEDIUM', 'FIRE_TRUCK_LARGE'];
  return vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
}

async function setvehicle() {
	console.log('[Setting] Setting vehicles');
	try {
		const vehicleInfoRes = await axios.get(`${service_url}/api/vehicles/all`, config);
		const vehicles = vehicleInfoRes.data.data;
		const requiredVehicleCount = parseInt(process.env.EMERGENCY_VEHICLE_COUNT);
		
		const jsonString = await fs_promises.readFile('./data/emergency_info.json', 'utf8');
		const configData = JSON.parse(jsonString);
		configData.vehicleInfos = [];
		
		for (let i = 0; i < vehicles.length && i < requiredVehicleCount; i++) {
			configData.vehicleInfos.push({
				"vehicleId": vehicles[i].vehicleId,
				"vehicleType": vehicles[i].vehicleType,
				"licenceNumber": vehicles[i].licenceNumber
			});
		}

		if (vehicles.length < requiredVehicleCount) {
		const newVehicles = requiredVehicleCount - vehicles.length;

		for (let i = 0; i < newVehicles; i++) {
			let licenceNumber;
			let res;
			do {
				licenceNumber = `${getRandomInt(100,999)}${getRandomChar()}${getRandomInt(1000,9999)}`;
				const vehicleType = getRandomVehicleType();
				res = await axios.post(`${service_url}/api/vehicles`, {
						"countryCode": "ko-KR",
						"licenceNumber": licenceNumber,
						"vehicleType": vehicleType
					}, config).catch(e => console.log(e));
				configData.vehicleInfos.push({
					"vehicleId": res.data.data.vehicleId,
					"vehicleType": vehicleType,
					"licenceNumber": licenceNumber
				});
			} while (res.status != 200);
		}
	}

	fs.writeFileSync('./data/emergency_info.json', JSON.stringify(configData, null, 2));
	} catch (error) {
		console.error(`Failed to update vehicles: ${error}`);
	}
}


async function getRandomLocation(latitude, longitude, radiusInKm) {
  const radiusInDegrees = radiusInKm / 111;

  const w = radiusInDegrees * Math.sqrt(Math.random());
  const t = 2 * Math.PI * Math.random();
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);

  const newLongitude = x / Math.cos(latitude);
  const newLatitude = y;

  return [longitude + newLongitude, latitude + newLatitude];
}

async function saveLocationToFile(filePath, centerLatitude, centerLongitude, radiusInKm, minDistance) {
    const jsonData = {};
    let res, startLocation, endLocation;

    do {
        startLocation = await getRandomLocation(centerLatitude, centerLongitude, radiusInKm);
        endLocation = await getRandomLocation(centerLatitude, centerLongitude, radiusInKm);
        jsonData.startLocation = startLocation;
        jsonData.endLocation = endLocation;
        console.log(`startLocation: ${startLocation}, endLocation: ${endLocation}`);

        res = await axios.post(`${service_url}/api/navi/route`, {
            "source": startLocation.join(','),
            "dest": endLocation.join(','),
            "options": "",
            "provider": "OSRM",
        }, config).catch(e => console.log(e));


		if(res.status != 200) {
			console.error(`Failed to get pathPoint for vehicle ${jsonData.vehicleId}: ${res.data.code}`);
			break;
		}

        if(res.data.data.distance < minDistance) {
    		continue;
        }

        jsonData.pathPointSize = res.data.data.pathPointSize;
        jsonData.distance = res.data.data.distance;
        jsonData.duration = res.data.data.duration;
        jsonData.pathPoint = res.data.data.pathPoint;
		fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
		break;
    } while (true);
}

async function setPathPoint() {
	console.log('[Setting] Setting path points');
	const centerLatitude = parseFloat(process.env.CENTER_LATITUDE);
	const centerLongitude = parseFloat(process.env.CENTER_LONGITUDE);
	const radiusInKm = parseFloat(process.env.RADIUS_IN_KM);
	const minDistance = parseFloat(process.env.MIN_DISTANCE);
	const testCaseCount = parseInt(process.env.ORDINARY_VEHICLE_COUNT);

	const dirPath = './data/paths';
	if (!fs.existsSync(dirPath)) {
		await fs_promises.mkdir(dirPath, { recursive: true });
	}

	const files = await fs_promises.readdir('./data/paths');
	for (const file of files) {
		if (file.startsWith('xy_list_')) {
			await fs_promises.unlink(`./data/paths/${file}`);
		}
	}

	for (let i = 0; i < testCaseCount; i++) {
		console.log(`[Setting] Setting path points ${i}`);
		await saveLocationToFile(`./data/paths/xy_list_${i}.json`, centerLatitude, centerLongitude, radiusInKm, minDistance);
	}
}

async function getAccessToken(configData) {
    const res = await axios.post(`${login_url}/api/account/auth`, {
        "loginType": "EMAIL_PW",
        "email": configData.id,
        "password": configData.pw
    }).catch(e => console.log(e.response.data.data));

    if(res.status != 200) {
        console.error(`Failed to get access token ${res.data.code}`);
        return;
    }

    return res.data.data.accessToken;
}

async function setTestData() {
	const jsonString = await fs_promises.readFile('./data/emergency_info.json', 'utf8');
    const configData = JSON.parse(jsonString);
    accessToken = await getAccessToken(configData);
	console.log(`Successfully got access token`);
    config = {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    };

    await setvehicle();
    await setPathPoint();
	console.log('[Setting] Done');
}

setTestData();