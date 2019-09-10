const request = require('request');
const logger = require('./logFunctions');

const sendErrorResponse = (res, message = null) => {
    res.status(200).send({
        text: (message) ? message : 'Whoops! Something went wrong :shrug:',
    });
};

const sendResponse = (res, text) => {
    res.status(200).send({
        text,
    });
};

const sendPublicResponse = (res, text) => {
    res.status(200).send({
        response_type: 'in_channel',
        text,
    });
};

const sendDelayedErrorResponse = (url, text = null) => {
    request.post({
        url: url,
        json: true,
        body: {
            text: text ? text : 'Whoops! Something went wrong :shrug:'
        }
    }, (error, response, rawBody) => {
        if (error) {
            logger.logError(error);
        }
    });
}

const sendDelayedResponse = (url, text) => {
    request.post({
        url: url,
        json: true,
        body: {
            text: text
        }
    }, (error, response, rawBody) => {
        if (error) {
            logger.logError(error);
        }
    });
}

const sendDelayedPublicResponse = (url, text) => {
    request.post({
        url: url,
        json: true,
        body: {
            response_type: 'in_channel',
            text: text
        }
    }, (error, response, rawBody) => {
        if (error) {
            logger.logError(error);
        }
    });
}

module.exports = {
    sendErrorResponse,
    sendPublicResponse,
    sendResponse,
    sendDelayedErrorResponse,
    sendDelayedResponse,
    sendDelayedPublicResponse
};
