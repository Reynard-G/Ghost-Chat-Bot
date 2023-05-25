const { Logger } = require('leekslazylogger');
const { join } = require('path');

module.exports = new Logger({
    debug: false,
    directory: join(__dirname, '../../', "./logs/"),
    keepFor: 30,
    logToFile: true,
    splitFile: true,
    timestamp: 'YYYY-MM-DD HH:mm:ss'
});