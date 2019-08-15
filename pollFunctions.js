const resFunc = require('./responseFunctions');
const { replaceAll } = require('./utils');
const db = require('./dbUtils');

const vote = (res, requestBody, commandArray) => {
  if (commandArray.length > 1) {
    const selectedVote = parseInt(commandArray[1]);
    db.findOne({
      teamId: requestBody.team_id,
      channelId: requestBody.channel_id,
      isClosed: false
    })
      .then(poll => {
        if (poll) {
          console.log('POLL RETRIEVED', JSON.stringify(poll));
          // remove existing vote
          poll.choices.options.forEach(option => {
            option.votes = option.votes.filter(
              // eslint-disable-line no-param-reassign
              thisVote => thisVote !== requestBody.user_id
            );
          });
          // add new vote
          poll.choices.options[selectedVote - 1].votes.push(
            requestBody.user_id
          );
          db.replaceChoices({
            pollId: poll.id,
            choices: poll.choices
          })
            .then(response => {
              console.log('response: ', response);
              resFunc.sendResponse(res, 'Your vote has been recorded');
            })
            .catch(err => {
              console.log(err);
              resFunc.sendErrorResponse(res);
            });
        } else {
          resFunc.sendErrorResponse(res);
        }
      })
      .catch(err => {
        console.log(err);
        resFunc.sendErrorResponse(res);
      });
  } else {
    resFunc.sendErrorResponse(res);
  }
};

const unvote = (res, requestBody) => {
  db.findOne({
    teamId: requestBody.team_id,
    channelId: requestBody.channel_id,
    isClosed: false
  }).then(poll => {
    if (poll) {
      poll.choices.options.forEach(option => {
        option.votes = option.votes.filter(
          // eslint-disable-line no-param-reassign
          thisVote => thisVote !== requestBody.user_id
        );
      });
      db.replaceChoices({
        pollId: poll.id,
        choices: poll.choices
      })
        .then(response => {
          console.log('response: ', response);
          resFunc.sendResponse(res, 'Your vote has been un-recorded');
        })
        .catch(err => {
          console.log(err);
          resFunc.sendErrorResponse(res);
        });
    } else {
      resFunc.sendErrorResponse(res);
    }
  });
};

const getFormattedPollResults = (poll, showVotes = true, requestBody) => {
  // let displayText = `*${poll.pollTitle}*\n`;
  let displayText = {
    response_type: 'in_channel',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${poll.pollTitle}*`
        }
      },
      {
        type: 'divider'
      }
    ]
  };

  poll.choices.options.forEach((option, index) => {
    displayText.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${option.index}. *${option.name}*`
      },
      accessory: {
        type: 'button',
        text: {
          type: 'plain_text',
          emoji: true,
          text: 'Vote'
        },
        value: 'click_me_123'
      }
    });

    if (showVotes) {
      console.log(option);
      if (option.votes.length > 0) {
        displayText.blocks.push({
          type: 'context',
          elements: [
            {
              type: 'image',
              image_url: `'https://api.slack.com/img/blocks/bkb_template_images/profile_1.png'`,
              alt_text: 'ji'
            }
          ]
        });
        // option.votes.forEach(vote => {
        //   console.log(
        //     'display text: ' +
        //       JSON.stringify(displayText.blocks[index + 3 + index])
        //   );
        //   console.log(
        //     'elements: ' + displayText.blocks[index + 3 + index].elements
        //   );
        //   console.log('index ' + index);
        //   displayText.blocks[index + 3 + index].elements.push({
        //     type: 'image',
        //     image_url:
        //       'https://api.slack.com/img/blocks/bkb_template_images/profile_1.png',
        //     alt_text: 'voter 1'
        //   });
        // });
        // displayText.blocks[index + 3 + index].elements.push({
        //   type: 'plain_text',
        //   emoji: true,
        //   text: `4 votes`
        // });
      }
    }
  });

  displayText.blocks.push({
    type: 'divider'
  });

  return displayText;
};

const createNewPoll = (res, requestBody, commandArray) => {
  let { text } = requestBody;
  text = replaceAll(text, '“', '"');
  text = replaceAll(text, '”', '"');
  const textArray = text.split('"');

  if (textArray.length > 2) {
    db.findOne({
      teamId: requestBody.team_id,
      channelId: requestBody.channel_id,
      isClosed: false
    })
      .then(existingPoll => {
        console.log(existingPoll);
        if (existingPoll) {
          resFunc.sendResponse(res, 'Only one poll at a time people.');
        } else {
          const newPoll = {
            teamId: requestBody.team_id,
            channelId: requestBody.channel_id,
            pollTitle: textArray[1],
            choices: {
              options: []
            },
            isClosed: false
          };
          const choicesArray = textArray[2].split(',');
          for (let i = 0; i < choicesArray.length; i++) {
            newPoll.choices.options.push({
              index: i + 1,
              name: choicesArray[i].trim(),
              votes: []
            });
          }
          db.createPoll(newPoll)
            .then(result => {
              if (result.rowCount != 1) {
                resFunc.sendErrorResponse(res);
              } else {
                resFunc.sendFormattedResponse(
                  res,
                  getFormattedPollResults(newPoll, false)
                );
              }
            })
            .catch(err => {
              console.log(err);
              resFunc.sendErrorResponse(res);
            });
        }
      })
      .catch(err => {
        console.log(err);
        resFunc.sendErrorResponse(res);
      });
  } else {
    resFunc.sendErrorResponse(
      res,
      'Improperly formatted poll Request.\n Use `/werewolf new "Poll title" Option1, Option2, Option3...` instead'
    );
  }
};

const getPollfromResultRow = row => {
  const {
    id,
    poll_title,
    choices,
    is_closed,
    channel_name,
    channel_id,
    team_name,
    team_id,
    created_date,
    closed_date
  } = row;
  const poll = {
    id,
    pollTitle: poll_title,
    choices,
    isClosed: is_closed,
    channelName: channel_name,
    channelId: channel_id,
    teamName: team_name,
    teamId: team_id,
    createdDate: created_date,
    closedDate: closed_date
  };
  return poll;
};

module.exports = {
  getFormattedPollResults,
  vote,
  unvote,
  createNewPoll,
  getPollfromResultRow
};
