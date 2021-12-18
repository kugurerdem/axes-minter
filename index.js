const MinterBot = require('./MinterBot');
require('dotenv').config();

async function main() {
    const bot = new MinterBot(process.env);
    bot.startMinting(5);
}

main();