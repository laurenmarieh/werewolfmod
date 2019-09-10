require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const gameFuncs = require('./gameFunctions');
const pollFuncs = require('./pollFunctions');
const resFuncs = require('./responseFunctions');
const logger = require('./logFunctions');
const utils = require('./utils');
const db = require('./dbUtils');

// Creates express app
const app = express();
// The port used for Express server
const PORT = 3000;

app.use(bodyParser.urlencoded({
    extended: true,
}));
app.use(bodyParser.json());

app.post('/', async (req, res) => {
    if (req.body.warmer) {
        resFuncs.sendResponse(res, `Warmed up!`);
        return;
    }

    const slashCommand = req.body.command;
    switch (slashCommand) {
        case '/ww':
        case '/werewolf':
            const requestBody = req.body;
            const commandArray = requestBody.text.split(' ');
            if (commandArray.length) {
                switch (commandArray[0]) {
                    case 'poll':
                        pollFuncs.createNewPoll(res, requestBody, commandArray);
                        break;
                    case 'game':
                        gameFuncs.startNewGame(res, requestBody);
                        break;
                    case 'results':
                        const rows = await db.findOneWithResults({
                            teamId: requestBody.team_id,
                            channelId: requestBody.channel_id,
                            isClosed: false,
                        });
                        if (!rows.length) {
                            resFuncs.sendResponse(res, 'There isn\'t a poll open right now.');
                        } else {
                            const poll = pollFuncs.getPollfromResultRows(rows);
                            const displayText = pollFuncs.getFormattedPollResults(poll);
                            res.status(200).send({
                                text: displayText,
                            });
                        }
                        break;
                    case 'close':
                        resFuncs.sendResponse(res, 'We are working on closing your poll.');
                        const pollId = await db.closePoll({
                            teamId: requestBody.team_id,
                            teamName: requestBody.team_domain,
                            channelId: requestBody.channel_id,
                            channelName: requestBody.channel_name
                        });
                        const response = await db.findOneByIdWithResults(pollId);
                        if (response.length > 0) {
                            const poll = pollFuncs.getPollfromResultRows(response);
                            if (poll.isGame) {
                                gameFuncs.closeNewGamePoll(res, requestBody.response_url, poll);
                            } else {
                                const pollResults = `Poll closed! \n${pollFuncs.getFormattedPollResults(poll)}`;
                                resFuncs.sendDelayedPublicResponse(requestBody.response_url, pollResults);
                            }
                        } else {
                            res.status(500).send(response);
                        }
                        break;
                    case 'vote':
                        pollFuncs.vote(res, requestBody, commandArray);
                        break;
                    case "unvote":
                    case "remove":
                    case "annul":
                    case "rescind":
                    case "repeal":
                        pollFuncs.unvote(res, requestBody);
                        break;
                    default:
                        resFuncs.sendErrorResponse(res);
                        break;
                }
            }
            break;
        case '/modspeak':
            let modText = req.body.text.trim();
            modText = `*\`\`\`${req.body.text.trim()}\`\`\`*`;
            if (modText.includes(`-here`)) {
                modText = `<!here>\n${modText.replace('-here', '')}`
            }
            request.post({
                url: req.body.response_url,
                json: true,
                body: {
                    response_type: 'in_channel',
                    text: modText
                }
            });
            res.status(200).send({
                text: "Your message has been posted.",
            });
            break;
        default:
            resFuncs.sendErrorResponse(res);
            break;
    }

});

app.get('/slackauth', (req, res) => {
    console.log(req.query);
    request.post('https://slack.com/api/oauth.access', {
        form: {
            client_id: process.env.SLACK_CLIENT_ID,
            client_secret: process.env.SLACK_CLIENT_SECRET,
            code: req.query.code,
            redirect_uri: 'https://09fa5881.ngrok.io/slackauth',
        },
    }, (error, response, rawBody) => {
        if (error) {
            logger.logError(error);
        }
        const body = JSON.parse(rawBody);
        if (body.ok) {
            // const authCollection = database.collection('auth');
            const newAuth = {
                accessToken: body.access_token,
                scope: body.scope,
                userId: body.user_id,
                teamName: body.team_name,
                teamId: body.team_id,
                bot: {
                    botUserId: body.bot.bot_user_id,
                    botAccessToken: body.bot.bot_access_token,
                },
            };
            db.insertAuth(newAuth)
                .then((response) => {
                    console.log(response);
                    if (!response.ok) {
                        res.status(500).send(response);
                    }
                    res.status(200).send(`<!DOCTYPE html>
                <html>
                    <body>
                        <h1>You have added Werewolf to Slack!</h1>
                    </body>
                </html>`);
                }).catch(err => {
                    logger.logError(err);
                    res.status(500).send(err);
                });
        } else {
            res.status(200).send(`<!DOCTYPE html>
                <html>
                    <body>
                        <p>${body.error}</p>
                    </body>
                </html>`);
        }
    });
});

// Starts Local server -- COMMENT OUT FOR DEPLOYMENT
app.listen(process.env.PORT || PORT, () => {
    console.log(`Bot is listening on port ${PORT}`);
});

// Allows for Deployment - COMMENT OUT TO RUN LOCAL
// module.exports = app;