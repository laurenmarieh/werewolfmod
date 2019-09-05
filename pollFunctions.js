const resFunc = require('./responseFunctions');
const {
    replaceAll
} = require('./utils');
const db = require('./dbUtils');
const logger = require('./logFunctions');

const vote = async (res, requestBody, commandArray) => {
    try {
        if (commandArray.length > 1) {
            const selectedVote = parseInt(commandArray[1]);
            const poll = await db.findOneWithResults({
                teamId: requestBody.team_id,
                channelId: requestBody.channel_id,
                isClosed: false,
            });
            console.log(poll);
            if (poll.length) {
                logger.logInfo('POLL RETRIEVED ' + JSON.stringify(poll));
                let user = await db.getUser({
                    playerId: requestBody.user_id,
                    teamId: requestBody.team_id
                });
                if (!user) {
                    await db.insertUser({
                        playerId: requestBody.user_id,
                        teamId: requestBody.team_id,
                        gamesPlayed: 1
                    });
                    user = await db.getUser({
                        playerId: requestBody.user_id,
                        teamId: requestBody.team_id
                    });
                }
                const existingVote = poll.find(vote => vote.voter_id == user.id && vote.is_active);
                console.log(existingVote);
                const selectedOption = poll.find(option => option.option_index == selectedVote);
                if (!selectedOption) {
                    resFunc.sendResponse(res, 'Choose an actual option please.');
                } else {
                    if (existingVote) {
                        await db.deactivateVote(existingVote.poll_vote_id);
                    }
                    db.insertVote({
                        voterId: user.id,
                        optionId: selectedOption.poll_options_id
                    }).then((response) => {
                        console.log('response: ', response);
                        resFunc.sendResponse(res, 'Your vote has been recorded');
                    }).catch(err => {
                        logger.logError(err);
                        resFunc.sendErrorResponse(res);
                    });
                }
            } else {
                resFunc.sendErrorResponse(res);
            }
        } else {
            resFunc.sendErrorResponse(res);
        }
    } catch (err) {
        console.log(err);
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
    console.log(rows);
    rows.forEach(voteRow => {
        let option_index = poll.choices.findIndex(choice => choice.index == voteRow.option_index);
        if (option_index < 0) {
            poll.choices.push({
                index: voteRow.option_index,
                name: voteRow.option_name,
                votes: []
            });
            option_index = poll.choices.length - 1;
        }
        if (voteRow.voter_id && voteRow.is_active) {
            poll.choices[option_index].votes.push(voteRow.voter_id)
        }
    });
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