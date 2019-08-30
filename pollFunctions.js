const resFunc = require('./responseFunctions');
const {
    replaceAll
} = require('./utils');
const db = require('./dbUtils');
const logger = require('./logFunctions');

const vote = (res, requestBody, commandArray) => {
    console.log(requestBody);
    if (commandArray.length > 1) {
        const selectedVote = parseInt(commandArray[1]);
        db.findOneWithResults({
            teamId: requestBody.team_id,
            channelId: requestBody.channel_id,
            isClosed: false,
        }).then((poll) => {
            if (poll.length) {
                logger.logInfo('POLL RETRIEVED ' + JSON.stringify(poll));
                // add new vote
                const existingVote = poll.find(vote => vote.voter_id == requestBody.user_id);
                const selectedOption = poll.find(option => option.option_index == selectedVote);
                if (!selectedOption) {
                    resFunc.sendResponse(res, 'Choose an actual option please.');
                } else {
                    if (existingVote) {
                        db.replaceVote({
                            voteId: existingVote.poll_vote_id,
                            optionId: selectedOption.poll_options_id
                        }).then((response) => {
                            console.log('response: ', response);
                            resFunc.sendResponse(res, 'Your vote has been recorded');
                        }).catch(err => {
                            logger.logError(err);
                            resFunc.sendErrorResponse(res);
                        });
                    } else {
                        db.addVote({
                            voterId: requestBody.user_id,
                            optionId: selectedOption.poll_options_id
                        }).then((response) => {
                            console.log('response: ', response);
                            resFunc.sendResponse(res, 'Your vote has been recorded');
                        }).catch(err => {
                            logger.logError(err);
                            resFunc.sendErrorResponse(res);
                        });
                    }
                    poll.choices.options[selectedVote - 1].votes.push(requestBody.user_id);
                }
            } else {
                resFunc.sendErrorResponse(res);
            }
        }).catch(err => {
            logger.logError(err);
            resFunc.sendErrorResponse(res);
        });
    } else {
        resFunc.sendErrorResponse(res);
    }
};

const unvote = (res, requestBody) => {
    db.findOne({
            "teamId": requestBody.team_id,
            "channelId": requestBody.channel_id,
            "isClosed": false
        })
        .then((poll) => {
            if (poll) {
                poll.choices.options.forEach((option) => {
                    option.votes = option.votes.filter( // eslint-disable-line no-param-reassign
                        thisVote => thisVote !== requestBody.user_id,
                    );
                });
                db.replaceChoices({
                        pollId: poll.id,
                        choices: poll.choices
                    })
                    .then((response) => {
                        console.log('response: ', response);
                        resFunc.sendResponse(res, 'Your vote has been un-recorded');
                    }).catch(err => {
                        logger.logError(err);
                        resFunc.sendErrorResponse(res);
                    });
            } else {
                resFunc.sendErrorResponse(res);
            }
        });
}

const getFormattedPollResults = (poll, showVotes = true) => {
    let displayText = `*${poll.pollTitle}*\n`;
    poll.choices.forEach((option) => {
        displayText += `*${option.index}* ${option.name}`;
        if (showVotes) {
            displayText += ` - ${option.votes.length}\n`;
            option.votes.forEach((myVote) => {
                displayText += `            <@${myVote}>\n`;
            });
        } else {
            displayText += '\n';
        }
    });
    return displayText;
};

const createNewPoll = (res, requestBody, commandArray) => {
    let {
        text
    } = requestBody;
    text = replaceAll(text, '“', '"');
    text = replaceAll(text, '”', '"');
    const textArray = text.split('"');

    if (textArray.length > 2) {
        db.findOne({
            teamId: requestBody.team_id,
            channelId: requestBody.channel_id,
            isClosed: false,
        }).then((existingPoll) => {
            console.log(existingPoll);
            if (existingPoll) {
                resFunc.sendResponse(res, 'Only one poll at a time people.');
            } else {
                console.log('RequestBody: ', requestBody)
                const newPoll = {
                    teamId: requestBody.team_id,
                    teamName: requestBody.team_domain,
                    channelId: requestBody.channel_id,
                    channelName: requestBody.channel_name,
                    pollTitle: textArray[1],
                    choices: [],
                    isClosed: false,
                    isGame: false
                };
                const choicesArray = textArray[2].split(',');
                for (let i = 0; i < choicesArray.length; i++) {
                    newPoll.choices.push({
                        index: i + 1,
                        name: choicesArray[i].trim(),
                        votes: [],
                    });
                }
                db.createPoll(newPoll).then((result) => {
                    if (result.rowCount != 1) {
                        resFunc.sendErrorResponse(res);
                    } else {
                        resFunc.sendPublicResponse(res, `Poll Created!\n${getFormattedPollResults(newPoll, false)}`);
                    }
                }).catch(err => {
                    logger.logError(err);
                    resFunc.sendErrorResponse(res);
                });
            }

        }).catch(err => {
            logger.logError(err);
            resFunc.sendErrorResponse(res);
        });
    } else {
        resFunc.sendErrorResponse(res, 'Improperly formatted poll Request.\n Use `/werewolf new "Poll title" Option1, Option2, Option3...` instead');
    }
};

const getPollfromResultRows = (rows) => {
    const {
        poll_id,
        poll_title,
        is_closed,
        is_game,
        channel_name,
        channel_id,
        team_name,
        team_id,
        created_date,
        closed_date
    } = rows[0];
    const poll = {
        id: poll_id,
        pollTitle: poll_title,
        isClosed: is_closed,
        isGame: is_game,
        channelName: channel_name,
        channelId: channel_id,
        teamName: team_name,
        teamId: team_id,
        createdDate: created_date,
        closedDate: closed_date,
        choices: []
    }
    rows.forEach(voteRow => {
        const option_index = poll.choices.findIndex(choice => choice.index == voteRow.option_index);
        if (option_index && voteRow.voter_id) {
            poll.choices[option_index].votes.push(voteRow.voter_id)
        } else {
            poll.choices.push({
                index: voteRow.option_index,
                name: voteRow.option_name,
                votes: voteRow.voter_id ? [voteRow.voter_id] : []
            });
        }
    });
    poll.choices.reverse();
    poll.choices.forEach(choice => {
        choice.votes.reverse();
    });
    return poll
};

module.exports = {
    getFormattedPollResults,
    vote,
    unvote,
    createNewPoll,
    getPollfromResultRows,
};