
const sendErrorResponse = (res) => {
    res.status(200).send({
        text: 'Whoops! Something went wrong :shrug:',
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

module.exports = {
    sendErrorResponse,
    sendPublicResponse,
    sendResponse,
};
