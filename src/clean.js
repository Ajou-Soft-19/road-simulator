const fs_promises = require('fs').promises;
const fs = require('fs');

async function clean() {
    console.log('Cleaning path points for dummy cars');
    const dirPath = './data/paths';
    if (!fs.existsSync(dirPath)) {
        return;
    }

    const files = await fs_promises.readdir('./data/paths');
    for (const file of files) {
        if (file.startsWith('xy_list_')) {
            await fs_promises.unlink(`./data/paths/${file}`);
        }
    }
}

clean();