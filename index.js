require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const request = require("request");
const mongoClient = require("mongodb").MongoClient;
const objectId = require("mongodb").ObjectID;

// Creates express app
const app = express();
// The port used for Express server
const PORT = 3000;
// The name of the database 
const DATABASE_NAME = "werewolf";
// Starts server
app.listen(process.env.PORT || PORT, function () {
    mongoClient.connect(process.env.DATABASE_CONNECTION, {
        useNewUrlParser: true
    }, (error, client) => {
        if (error) {
            console.log(`Unable to connect to ${process.env.DATABASE_CONNECTION}`);
            throw error;
        }
        database = client.db(DATABASE_NAME);
        collection = database.collection("polls");
        console.log("Connected to `" + DATABASE_NAME + "`!");
    });
    console.log('Bot is listening on port ' + PORT);
});

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.post('/', (req, res) => {
    console.log(req.body);
    var slashCommand = req.body.command;
    switch (slashCommand) {
        case "/werewolf":
            var requestBody = req.body;
            var commandArray = requestBody.text.split(' ');
            if (commandArray.length) {
                switch (commandArray[0]) {
                    case "new":
                        createNewPoll(res, requestBody, commandArray);
                        break;
                    case "results":
                        collection.findOne({
                                "teamId": requestBody.team_id,
                                "channelId": requestBody.channel_id,
                                "isClosed": false
                            })
                            .then((poll) => {
                                var displayText = getFormattedPollResults(poll);
                                res.status(200).send({
                                    "text": displayText
                                });
                            });
                        break;
                    case "close":
                        collection.findOneAndUpdate({
                                "teamId": requestBody.team_id,
                                "channelId": requestBody.channel_id,
                                "isClosed": false
                            }, {
                                $set: {
                                    "isClosed": true
                                }
                            })
                            .then((response) => {
                                if (response.ok) {
                                    var pollResults = "Poll closed! \n" + getFormattedPollResults(response.value);
                                    sendPublicResponse(res, pollResults);
                                } else {
                                    res.status(500).send(response);
                                }

                            });
                        break;
                    case "vote":
                        vote(res, requestBody, commandArray);
                        break;
                    default:
                        sendErrorResponse(res);
                        break;
                }
            }

            break;
        default:
            sendErrorResponse(res);
            break;
    }
});

const createNewPoll = (res, requestBody, commandArray) => {
    if (commandArray.length > 2) {
        var newPoll = {
            teamId: requestBody.team_id,
            channelId: requestBody.channel_id,
            title: requestBody.text.match(/"([^']+)"/)[1],
            choices: [],
            isClosed: false
        };
        var choiceSplit = requestBody.text.split("\"");
        if (choiceSplit.length < 2) {
            sendErrorResponse(res);
        }
        var choicesArray = choiceSplit[2].split(",");
        for (var i = 0; i < choicesArray.length; i++) {
            newPoll.choices.push({
                index: i - 1,
                name: choicesArray[i].trim(),
                votes: []
            });
        };
        collection.insertOne(newPoll, (error, result) => {
            if (error) {
                return response.status(500).send(error);
            }
            sendPublicResponse(res, "Poll Created!\n" + getFormattedPollResults(newPoll));
        });
    } else {
        sendErrorResponse(res);
    }
};

const vote = (res, requestBody, commandArray) => {
    if (commandArray.length > 1) {
        var selectedVote = parseInt(commandArray[1]);
        collection.findOne({
                "teamId": requestBody.team_id,
                "channelId": requestBody.channel_id,
                "isClosed": false
            })
            .then((document) => {
                if (document) {
                    // remove existing vote
                    document.choices.forEach((choice) => {
                        choice.votes = choice.votes.filter(vote => vote !== requestBody.user_name);
                    });
                    // add new vote 
                    document.choices[selectedVote - 1].votes.push(requestBody.user_name);
                    collection.findOneAndReplace({
                            "_id": document._id
                        }, document)
                        .then((response) => {
                            sendResponse(res, "vote has been recorded");
                        })
                } else {
                    sendErrorResponse(res);
                }
            });
    } else {
        sendErrorResponse(res);
    }
};

const sendErrorResponse = (res) => {
    res.status(200).send({
        "text": "Whoops! Something went wrong :shrug:"
    });
};

const sendResponse = (res, text) => {
    res.status(200).send({
        "text": text
    });
}

const sendPublicResponse = (res, text) => {
    res.status(200).send({
        "response_type": "in_channel",
        "text": text
    });
}

const getFormattedPollResults = (poll) => {
    var displayText = `*${poll.title}*\n`;
    poll.choices.forEach((choice) => {
        displayText += `${choice.name} - ${choice.votes.length}\n`;
        choice.votes.forEach((vote) => {
            displayText += `    ${vote}\n`;
        });
    });
    return displayText;
}