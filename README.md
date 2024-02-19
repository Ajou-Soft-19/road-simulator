# Road Network Simulation

Korean version Documentation: [도로 네트워크 시뮬레이션](./README_KR.md)

## 1. Test Environment Installation

```bash
npm i
```

After `git clone`, execute the above command in the corresponding directory to install dependencies.

## 2. Create or Modify .env File

```bash
LOGIN_URL=https://ajou-epas.xyz:7000
SERVICE_URL=https://ajou-epas.xyz:7001
SOCKET_URL=wss://ajou-epas.xyz:7002

CENTER_LATITUDE=37.351855 => Reference latitude
CENTER_LONGITUDE=127.105333 => Reference longitude
RADIUS_IN_KM=3 => Radius based on the reference point
MIN_DISTANCE=1000 => Minimum length of the path to create
ORDINARY_VEHICLE_COUNT=100 => Number of ordinary vehicles
EMERGENCY_VEHICLE_COUNT=2 => Number of emergency vehicles
```

- It randomly creates starting and ending points within the radius set based on the reference point, and creates a path where the distance between the starting point and the end point is larger than the minimum length.
- You can set the number of ordinary vehicles and emergency vehicles.
- You can adjust the test to be created with `npm run init` through the `.env` file below.

## 3. Test Case Creation

```bash
npm run init
```

- Creates a test case for simulation.
- For ordinary vehicles, it is saved in `./data/paths` folder in `xy_list_number.json` format.
- For emergency vehicles, it is saved in `./data/emergency_info.json`. If there are not enough vehicles registered in the account for emergency vehicles, it automatically registers vehicles and saves them.
- **In this case, the starting and ending points of the emergency vehicle are not automatically selected, so they must be selected manually.**

The format of emergency_info.json is as follows. It has been set as below for test execution.

```json
{
  "id": "ajouepas@ajou.ac.kr",
  "pw": "ajouepas1234!?",
  "vehicleInfos": [
    {
      "vehicleId": 27,
      "vehicleType": "FIRE_TRUCK_MEDIUM",
      "licenceNumber": "947Y1201"
    },
  ],
  "locations": [
    {
      "startLocation": [
        127.105985,
        37.342602
      ],
      "endLocation": [
        127.122909,
        37.352029
      ]
    },
  ]
}
```

- `ajouepas@ajou.ac.kr` is an account with emergency vehicle authorization.
- You can use this account to register emergency vehicles to run the test.

## 4. Setting Traffic Ligth Data

traffix data is saved in `./data/traffic_lights.json`.

```json
[
    {
        "location": [
            127.106012,
            37.353433
        ],
        "directions": {
            "0": "green",
            "90": "red",
            "180": "red",
            "270": "red"
        }
    },
    {
        "location": [
            127.108994,
            37.345825
        ],
        "directions": {
            "0": "red",
            "90": "red",
            "180": "red",
            "270": "green"
        }
    }
]
```

- `location` represents the location of the traffic light, and `directions` represents the direction of the traffic light.
- The keys of `directions` represent each direction, and the values represent the state of the traffic light as `green` or `red`.
- For example, if a vehicle is driving due north, it checks the state of the traffic light corresponding to `0`. The angle is setted in 30-degrees interval.
- Set the traffic light data by checking the coordinates and direction of the intersection.
- The `traffic_controller.js` file updates the state of the traffic lights every 20 seconds.

## 4. Test Case Execution

```bash
npm run sim
```

- Starts the simulation of ordinary vehicles, emergency vehicles, and traffic lights.
- The simulation can be visually checked through the monitoring page of the `EPSA` app.

<div align="center">
    <img src="https://github.com/Ajou-Soft-19/road-simulator/assets/32717522/ade13bb5-91ff-47ae-8567-16cff7a2908d" width="500">
</div>

- The `gif` above is a screenshot of the `EPAS monitoring page`.

```bash
npm run traffic
```

- Starts the traffic light simulation.

```bash
npm run emergency
```

- Starts the emergency vehicle simulation.

```bash
npm run dummy
```

- Starts the ordinary vehicle simulation.

## 5. End of Test Case

- To end the test case, press `Ctrl + C` on Windows.

## 6. Removal of Test Case

```bash
npm run clean
```

- Removes the created test case.
- Only the data of ordinary vehicles is removed. The data of emergency vehicles must be removed manually.
