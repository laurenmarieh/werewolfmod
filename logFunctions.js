const fs = require('fs');

const logError = (error) => {
    fs.appendFile("/Logs/ModBot/error_logs.txt", (new Date()).toString() + ': \t' + error + '\r\n', function (err) {
        if (err) {
            return logger.logError(err);
        }
    });
}

const logInfo = (info) => {
    fs.appendFile("/Logs/ModBot/info_logs.txt", (new Date()).toString() + ': \t' + info + '\r\n', function (err) {
        if (err) {
            return logger.logError(err);
        }
    });
}

module.exports = {
    logError,
    logInfo
};