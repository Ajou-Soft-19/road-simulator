const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const token = process.env.TOKEN;
const url = process.env.URL;
const testCaseCount = parseInt(process.env.TEST_CASE_COUNT);
const config = {
    headers: {
        'Authorization': `Bearer ${token}`
    }
};


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
  const vehicleTypes = ['SMALL_CAR', 'MEDIUM_CAR', 'LARGE_TRUCK', 'LARGE_CAR'];
  return vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
}

async function setvehicle() {
  try {
    const res = await axios.get(`${url}:7001/api/vehicles/all`, config);
    const vehicles = res.data.data;
    const requiredVehicleCount = testCaseCount;

    // 기존에 등록된 차량의 ID를 JSON 파일에 쓰기
    for (let i = 0; i < vehicles.length; i++) {
        const filePath = `./data/xy_list_${i + 1}.json`;
        let jsonData;
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            jsonData = JSON.parse(fileContent);
        } else {
            jsonData = {};
        }
        jsonData.vehicleId = vehicles[i].vehicleId;
        jsonData.vehicleType = vehicles[i].vehicleType;
        jsonData.licenceNumber = vehicles[i].licenceNumber;
        fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
    }

    if (vehicles.length < requiredVehicleCount) {
      const newVehicles = requiredVehicleCount - vehicles.length;

      for (let i = 0; i < newVehicles; i++) {
        let licenceNumber;
        let res;
        do {
          licenceNumber = `${getRandomInt(100,999)}${getRandomChar()}${getRandomInt(1000,9999)}`;
          const vehicleType = getRandomVehicleType();
          res = await axios.post(`${url}:7001/api/vehicles`, {
              "countryCode": "ko-KR",
              "licenceNumber": licenceNumber,
              "vehicleType": vehicleType
          }, config).catch(e => e);
        } while (res.status != 200);

        const newVehicleId = res.data.data.vehicleId;
        const newVehicleType = res.data.data.vehicleType;
        const newLicenceNumber = res.data.data.licenceNumber;
        const filePath = `./data/xy_list_${vehicles.length + i + 1}.json`;
        let jsonData;
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          jsonData = JSON.parse(fileContent);
        } else {
          jsonData = {};
        }
        jsonData.vehicleId = newVehicleId;
        jsonData.vehicleType = newVehicleType;
        jsonData.licenceNumber = newLicenceNumber;
        fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
      }
    }
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
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);
    let res, startLocation, endLocation;

    do {
        startLocation = await getRandomLocation(centerLatitude, centerLongitude, radiusInKm);
        endLocation = await getRandomLocation(centerLatitude, centerLongitude, radiusInKm);
        jsonData.startLocation = startLocation;
        jsonData.endLocation = endLocation;
        console.log(`startLocation: ${startLocation}, endLocation: ${endLocation}`);

        res = await axios.post(`${url}:7001/api/navi/route`, {
            "source": startLocation.join(','),
            "dest": endLocation.join(','),
            "options": "",
            "provider": "OSRM",
            "vehicleId": jsonData.vehicleId
        }, config).catch(e => console.log(e.response.data.data));


		if(res.status != 200) {
			console.error(`Failed to get pathPoint for vehicle ${jsonData.vehicleId}: ${res.data.code}`);
            break;
		}

        if(res.data.data.distance <= 2000) {
    		continue;
        }

        jsonData.pathPointSize = res.data.data.pathPointSize;
        jsonData.distance = res.data.data.distance;
        jsonData.duration = res.data.data.duration;
        jsonData.pathPoint = res.data.data.pathPoint;
        fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
    } while (false);
}

function setPathPoint() {
  const centerLatitude = parseFloat(process.env.CENTER_LATITUDE);
  const centerLongitude = parseFloat(process.env.CENTER_LONGITUDE);
  const radiusInKm = parseFloat(process.env.RADIUS_IN_KM);
  const minDistance = parseFloat(process.env.MIN_DISTANCE);

  const files = fs.readdirSync('./data');
  for (const file of files) {
    if (file.startsWith('xy_list_') && file.endsWith('.json')) {
      saveLocationToFile(`./data/${file}`, centerLatitude, centerLongitude, radiusInKm, minDistance);
    }
  }
}


async function setTestData() {
    await setvehicle();

    setPathPoint();
}

setTestData();