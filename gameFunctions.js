require('dotenv').config();

const resFunc = require('./responseFunctions');
const db = require('./dbUtils');
const pollFuncs = require('./pollFunctions');
const request = require('request');

const startNewGame = (res, requestBody) => {
    const newPoll = {
        isGame: true,
        isClosed: false,
        choices: {
            options: [{
                    index: 1,
                    name: 'Im in!',
                    votes: []
                },
                {
                    index: 2,
                    name: 'Not this time.',
                    votes: []
                }
            ]
        },
        teamId: requestBody.team_id,
        channelId: requestBody.channel_id,
        pollTitle: "New Game Anyone?"
    };
    db.createPoll(newPoll).then((result) => {
        if (result.rowCount != 1) {
            resFunc.sendErrorResponse(res);
        } else {
            resFunc.sendPublicResponse(res, `Poll Created!\n${pollFuncs.getFormattedPollResults(newPoll, false)}`);
        }
    }).catch(err => {
        console.log(err);
        resFunc.sendErrorResponse(res);
    });
}

const closeNewGamePoll = (res, responseUrl, poll) => {
    resFunc.sendResponse(res, 'LETS START THIS THING');
    const roles = assignRoles(poll, ['seer', 'doc']);
    request.post({
        url: responseUrl,
        json: true,
        body: {
            text: getFormattedRoles(roles) || 'You need more than 1 player...'
        }
    }, (error, response, rawBody) => {
        if (error) {
            console.log(error);
        }
    });
    notifyPlayers(roles);
    // Keeping this around for later
    //
    // request.get({
    //     url: 'https://slack.com/api/conversations.list?types=private_channel',
    //     json: true,
    //     headers: {
    //         Authorization: 'Bearer ' + process.env.SLACK_AUTH_TOKEN
    //     }
    // }, (error, response, body) => {
    //     if (error) {
    //         console.log(error);
    //     } else {
    //         const bgChannel = body.channels.find(x => x.name == 'nothing-to-see-here');
    //         if (bgChannel) {
    //             console.log('Found BG Channel');
    //             if (bgChannel.is_archived) {
    //                 console.log('BG Channel is archived, unarchiving');
    //                 unarchiveChannel(bgChannel.id).then(() => {
    //                     console.log('Successfully unarchived, setting up BG channel');
    //                     setupBGChannel(roles, bgChannel.id);
    //                 });
    //             } else {
    //                 setupBGChannel(roles, bgChannel.id);
    //             }
    //         } else {
    //             // createChannel().then((newChannelId) => {
    //             //     createGroup(roles.filter(x => x.role == 'bg'), newChannelId);
    //             // })
    //         }
    //     }
    // });
}

const getFormattedRoles = (players) => {
    let roleDisplay = 'Player Roles: \n';
    players.sort((a,b) => a.id - b.id);
    players.forEach((player) => {
        roleDisplay += `\t*<@${player.id}>*`;
        if (player.role) {
            roleDisplay += `(${player.role})`;
        }
        roleDisplay += `\n`;
    });
    return roleDisplay;
}

const unarchiveChannel = (channelId) => {
    return new Promise((resolve, reject) => {
        request.post({
            url: 'https://slack.com/api/conversations.unarchive',
            json: true,
            headers: {
                Authorization: 'Bearer ' + process.env.SLACK_AUTH_TOKEN
            },
            body: {
                channel: channelId,
            }
        }, (error, response, rawBody) => {
            console.log(rawBody);
            if (error) {
                console.log(error);
                reject();
            }
            resolve();
        });
    });
}

const setupBGChannel = (players, channelId) => {
    console.log('Removing players from BG Channel');
    kickGroup(players, channelId).then(() => {
        console.log('Adding players to bg channel');
        createGroup(players.filter(x => x.role == 'bg'), channelId);
    });
}

const notifyPlayers = (players) => {
    players.forEach((player) => {
        request.post({
            url: 'https://slack.com/api/chat.postMessage',
            json: true,
            headers: {
                Authorization: 'Bearer ' + process.env.SLACK_AUTH_TOKEN
            },
            body: {
                channel: player.id,
                text: getRoleText(player.role)
            }
        }, (error, response, rawBody) => {
            if (error) {
                console.log(error);
            }
        });
    });

}

const kickGroup = (players, channelId) => {
    let response = new Promise((resolve, reject) => {
        let count = 0;
        players.forEach(player => {
            request.post({
                url: 'https://slack.com/api/conversations.kick',
                json: true,
                headers: {
                    Authorization: 'Bearer ' + process.env.SLACK_AUTH_TOKEN
                },
                body: {
                    channel: channelId,
                    user: player.id
                }
            }, (err, res, body) => {
                console.log(body);
                if (err) {
                    console.log(err);
                }

                if (body.ok) {
                    count++;
                    if (count >= players.length) {
                        resolve();
                    }
                } else if (body.error == 'cant_kick_self') {
                    request.post({
                        url: 'https://slack.com/api/conversations.leave',
                        json: true,
                        headers: {
                            Authorization: 'Bearer ' + process.env.SLACK_AUTH_TOKEN
                        },
                        body: {
                            channel: channelId
                        }
                    }, (err, res, body) => {
                        console.log(body);
                        if (err) {
                            console.log(err);
                        }

                        if (body.ok) {
                            count++;
                            if (count >= players.length) {
                                resolve();
                            }
                        }
                    });
                }
            });
        });
    });
    return response;
}

const createGroup = (players, channelId) => {
    players.forEach(player => {
        request.post({
            url: 'https://slack.com/api/conversations.invite',
            json: true,
            headers: {
                Authorization: 'Bearer ' + process.env.SLACK_AUTH_TOKEN
            },
            body: {
                channel: channelId,
                users: player.id
            }
        }, (err, res, body) => {
            console.log(body);
            if (err) {
                console.log(err);
            }
        });
    });

}

const getRoleText = (role) => {
    switch (role) {
        case 'seer':
            return 'You are the seer. Each night you get to view one player. You win when all the BGs are dead.';
        case 'doc':
            return 'You are the doctor. Each night you get to save one player from a night death. You win when all the BGs are dead.';
        case 'bg':
            return 'You are Bad Guy. You win when there are the same number (or more) BGs left alive than GGs.';
        default:
            return 'You are just a plane jane villager. You win when all the BGs are dead.';
    }
}

const assignRoles = (poll, roles) => {
    let players = poll.choices.options[0].votes;
    if (players.length > 1) {
        var numberBGs = Math.round(players.length * 0.20) || 1;
        var assignedPlayers = [];
        while (players.length > 0) {

            if (assignedPlayers.length < numberBGs) {
                var rng = randomNumber(players.length);
                assignedPlayers.push({
                    id: players[rng],
                    role: 'bg',
                    dead: false
                });
                players.splice(rng, 1);
            } else if (roles.length) {
                var rng = randomNumber(players.length);
                assignedPlayers.push({
                    id: players[rng],
                    role: roles[0],
                    dead: false
                });
                players.splice(rng, 1);
                roles.splice(0, 1);
            } else {
                assignedPlayers.push({
                    id: players.pop(),
                    role: null,
                    dead: false
                });
            }
        }

        return assignedPlayers;
    }
}

const randomNumber = (max) => {
    return Math.floor(Math.random() * Math.floor(max));
}

module.exports = {
    startNewGame,
    closeNewGamePoll,
    notifyPlayers
};