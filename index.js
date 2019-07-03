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
            var command = req.body.text;
            var commandArray = command.split(' ');
            if (commandArray.length) {
                console.log(commandArray);
                switch (commandArray[0]) {
                    case "new":
                        if (commandArray.length > 2) {
                            var newPoll = {
                                title: commandArray[1],
                                choices: [],
                                isClosed: false
                            };
                            for (var i = 2; i < commandArray.length; i++) {
                                newPoll.choices.push({
                                    index: i - 1,
                                    name: commandArray[i],
                                    votes: []
                                });
                            };
                            sendResponse(res, "new poll has been created", newPoll);
                        } else {
                            sendResponse(res, "poll format must be /werepoll <<Title>> <<choice1>> <<choice2>>");
                        }
                        break;
                    case "results":
                        sendResponse(res, "results");
                        break;
                    case "close":
                        collection.findOneAndUpdate({
                                "isClosed": false
                            }, {
                                $set: {
                                    "isClosed": true
                                }
                            })
                            .then((response) => {
                                if (response.ok) {
                                    sendResponse(res, "close");
                                } else {
                                    res.status(500).send(response);
                                }

                            });
                        break;
                    case "vote":
                        if (commandArray.length > 1) {
                            var selectedVote = parseInt(commandArray[1]);
                            collection.findOne({
                                    "isClosed": false
                                })
                                .then((document) => {
                                    if (document) {
                                        document.choices[selectedVote - 1].votes.push(req.body.user_name);
                                        collection.findOneAndReplace({
                                                "_id": document._id
                                            }, document)
                                            .then((response) => {
                                                console.log(response);
                                                sendResponse(res, "vote has been recorded");
                                            })
                                    } else {
                                        sendResponse(res, "whoops something went wrong");
                                    }
                                });
                        } else {
                            sendResponse(res, "Choose someone to vote for.");
                        }
                        break;
                    default:
                        sendResponse(res, "unable to determine command");
                        break;
                }
            }

            break;
        default:
            sendResponse(res, "I don't recognize that command")
            break;
    }
});

const sendResponse = function (res, text, dbInsert) {
    if (dbInsert) {
        collection.insertOne(dbInsert, (error, result) => {
            if (error) {
                return response.status(500).send(error);
            }
            res.status(200).send({
                "text": text
            });
        });
    } else {
        res.status(200).send({
            "text": text
        });;
    }

}