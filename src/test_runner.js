const { turnTrafficControllerOn } = require('./traffic_controller');
const { startEmergencyVehicles } = require('./emergency_car');
const { startDummyVechicles } = require('./dummy_car');

async function main() {
    turnTrafficControllerOn();
    await startDummyVechicles();
    await startEmergencyVehicles();
}

main();
