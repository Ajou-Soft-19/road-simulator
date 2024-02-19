const { turnTrafficControllerOn } = require('./traffic_controller');
const { startEmergencyVehicles } = require('./emergency_car');
const { startDummyVechicles } = require('./dummy_car');

async function main() {
    if (process.argv[2] === 'traffic') {
        turnTrafficControllerOn();
    } else if (process.argv[2] === 'emergency') {
        await startEmergencyVehicles();
    }
    else if (process.argv[2] === 'dummy') {
        await startDummyVechicles();
    } 
    else {
        turnTrafficControllerOn();
        await startDummyVechicles();
        await startEmergencyVehicles();
    }
}

main();
