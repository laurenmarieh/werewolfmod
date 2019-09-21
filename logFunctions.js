const fs = require('fs');

const logError = error => {
    console.log(error);
    fs.appendFile(
        '/Logs/ModBot/error_logs.txt',
        new Date().toString() + ': \t' + error + '\r\n',
        function(err) {
            if (err) {
                console.log(err);
                logger.logError(err);
            }
        }
    );
};

const logInfo = info => {
    console.log(info);
    fs.appendFile(
        '/Logs/ModBot/info_logs.txt',
        new Date().toString() + ': \t' + info + '\r\n',
        function(err) {
            if (err) {
                console.log(err);
                logger.logError(err);
            }
        }
    );
};

module.exports = {
    logError,
    logInfo
};
