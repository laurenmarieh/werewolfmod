const resFunc = require('./responseFunctions');
const {
    replaceAll
} = require('./textFunctions');
const polls = require('./source/data/polls');
const votes = require('./source/data/votes');
const users = require('./source/data/users');
const logger = require('./logFunctions');

const vote = async (res, requestBody, commandArray) => {
    try {
        if (commandArray.length > 1) {
            const selectedVote = parseInt(commandArray[1]);
            if (selectedVote) {
                const poll = await polls.getByChannelWithResults({
                    teamId: requestBody.team_id,
                    channelId: requestBody.channel_id,
                    isClosed: false,
                });
                if (poll.length) {
                    logger.logInfo('POLL RETRIEVED ' + JSON.stringify(poll));
                    let user = await users.getUser({
                        playerId: requestBody.user_id,
                        teamId: requestBody.team_id
                    });
                    if (!user) {
                        await users.insertUser({
                            playerId: requestBody.user_id,
                            teamId: requestBody.team_id,
                            gamesPlayed: 1
                        });
                        user = await users.getUser({
                            playerId: requestBody.user_id,
                            teamId: requestBody.team_id
                        });
                    }
                    const existingVote = poll.find(vote => vote.voter_id == user.id && vote.is_active);
                    const selectedOption = poll.find(option => option.option_index == selectedVote);
                    if (!selectedOption) {
                        resFunc.sendResponse(res, 'Choose an actual option please.');
                    } else {
                        if (existingVote) {
                            await votes.deactivateVote(existingVote.poll_vote_id);
                        }
                        votes.insertVote({
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
                const laurens = ['lrn', 'lurne', 'laurne', 'lauren', 'larne'];
                const others = ['sell', 'chris', 'dan', 'satan', 'dodd', 'cale', 'cael', 'cake'];
                const stringVote = commandArray[1];
                if (laurens.includes(stringVote.toLowerCase())) {
                    res.status(200).send();
                    resFunc.sendDelayedPublicResponse(requestBody.response_url, 'Bad idea. Lauren is awesome, you should not vote for her :lauren-hair:');
                } else if (others.includes(stringVote.toLowerCase())) {
                    res.status(200).send();
                    resFunc.sendDelayedPublicResponse(requestBody.response_url, `Yeah, for sure vote for ${stringVote}. In fact, I suggest it.`);
                } else {
                    resFunc.sendResponse(res, 'Choose an actual option please.');
                }
            }
        } else {
            resFunc.sendErrorResponse(res);
        }
    } catch (err) {
        console.log(err);
    }
};

const unvote = async (res, requestBody) => {
    try {
        const poll = await polls.getByChannel({
            "teamId": requestBody.team_id,
            "channelId": requestBody.channel_id,
            "isClosed": false
        });
        if (poll) {
            votes.removeVote({
                    pollId: poll.id,
                    playerId: requestBody.user_id
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
    } catch (err) {
        console.log(err);
    }

}

const getFormattedPollResults = (poll, showVotes = true) => {
    let displayText = `*${poll.pollTitle}*\n`;
    poll.choices.sort((a, b) => a.index - b.index);
    poll.choices.forEach((option) => {
        displayText += `*${option.index}* ${option.name}`;
        if (showVotes) {
            displayText += ` - ${option.votes.length}\n`;
            option.votes.sort((a, b) => a.voteTime - b.voteTime);
            option.votes.forEach((myVote) => {
                console.log(myVote);
                displayText += `            <@${myVote.playerId}>\n`;
            });
        } else {
            displayText += '\n';
        }
    });
    return displayText;
};

const createNewPoll = async (res, requestBody, commandArray) => {
    let {
        text
    } = requestBody;
    text = replaceAll(text, '“', '"');
    text = replaceAll(text, '”', '"');
    const textArray = text.split('"');

    if (textArray.length > 2) {
        const existingPoll = await polls.getByChannel({
            teamId: requestBody.team_id,
            channelId: requestBody.channel_id,
            isClosed: false,
        });
        if (existingPoll) {
            resFunc.sendResponse(res, 'Only one poll at a time people.');
        } else {
            resFunc.sendResponse(res, 'Poll creation in progress. Please wait. Patiently.');
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
            const result = await polls.createPoll(newPoll);
            if (result.rowCount != 1) {
                resFunc.sendDelayedErrorResponse(requestBody.response_url);
            } else {
                resFunc.sendDelayedPublicResponse(requestBody.response_url, `${getFormattedPollResults(newPoll, false)}`);
            }
        }
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
        if (voteRow.player_id && voteRow.is_active) {
            poll.choices[option_index].votes.push({
                playerId: voteRow.player_id,
                voteTime: voteRow.vote_time
            });
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