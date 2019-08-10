const { resFunc } = require('./responseFunctions');
const { replaceAll } = require('./utils');
const { db } = require('./dbUtils');

const vote = (res, requestBody, commandArray) => {
    if (commandArray.length > 1) {
        const selectedVote = parseInt(commandArray[1]);
        db.findOne({
            teamId: requestBody.team_id,
            channelId: requestBody.channel_id,
            isClosed: false,
        })
            .then((poll) => {
                if (poll) {
                    console.log('POLL RETRIEVED', JSON.stringify(poll));
                    // remove existing vote
                    poll.choices.forEach((choice) => {
                        choice.votes = choice.votes.filter( // eslint-disable-line no-param-reassign
                            thisVote => thisVote !== requestBody.user_id,
                        );
                    });
                    // add new vote
                    poll.choices[selectedVote - 1].votes.push(requestBody.user_id);
                    db.replaceChoices({
                        pollId: poll.id,
                    }, poll.choices)
                        .then((response) => {
                            console.log('response: ', response);
                            resFunc.sendResponse(res, 'vote has been recorded');
                        });
                } else {
                    resFunc.sendErrorResponse(res);
                }
            });
    } else {
        resFunc.sendErrorResponse(res);
    }
};

const getFormattedPollResults = (poll, showVotes = true) => {
    let displayText = `*${poll.title}*\n`;
    poll.choices.forEach((choice) => {
        displayText += `*${choice.index}* ${choice.name}`;
        if (showVotes) {
            displayText += ` - ${choice.votes.length}\n`;
            choice.votes.forEach((myVote) => {
                displayText += `            <@${myVote}>\n`;
            });
        } else {
            displayText += '\n';
        }
    });
    return displayText;
};

const createNewPoll = (res, requestBody, commandArray) => {
    let { text } = requestBody;
    text = replaceAll(text, '“', '"');
    text = replaceAll(text, '”', '"');
    const textArray = text.split('"');

    if (commandArray.length > 2) {
        const newPoll = {
            teamId: requestBody.team_id,
            channelId: requestBody.channel_id,
            pollTitle: textArray[1],
            choices: [],
            isClosed: false,
        };
        if (textArray.length < 2) {
            resFunc.sendErrorResponse(res);
        }
        const choicesArray = textArray[2].split(',');
        for (let i = 0; i < choicesArray.length; i++) {
            newPoll.choices.push({
                index: i + 1,
                name: choicesArray[i].trim(),
                votes: [],
            });
        }
        db.createPoll(newPoll, (error, result) => {
            if (error) {
                resFunc.sendErrorResponse(res);
            } else {
                resFunc.sendPublicResponse(res, `Poll Created!\n${getFormattedPollResults(newPoll, false)}`);
            }
            console.log('Result:', result);
        });
    } else {
        resFunc.sendErrorResponse(res);
    }
};

module.exports = {
    getFormattedPollResults,
    vote,
    createNewPoll,
};