const { db } = require('../../dbConnection.js');
const logger = require('../../logFunctions');
db.connect()
    .catch(error => {
        // Db Connect Throws errors even when it works, 
        // It tries to authenticate with computer credentials before trying the .env credentials
        // console.log(error);
})

const getAll = async () => {
    db.query('SELECT * FROM polls where is_closed = false ORDER BY id ASC')
        .then((results) => {
            return results.rows;
        });
};

const getByChannel = async (req) => {
    const {
        teamId,
        channelId,
        isClosed
    } = req;
    return db.query('SELECT * FROM polls where team_id= $1 and channel_id =$2 and is_closed = $3 LIMIT 1',
        [teamId, channelId, isClosed]).then((results) => {
        return results.rows[0];
    });
};

const getByChannelWithResults = async (req) => {
    const {
        teamId,
        channelId,
        isClosed
    } = req;
    return db.query('SELECT *, poll_votes.id as poll_vote_id, poll_options.id as poll_options_id FROM polls INNER JOIN poll_options ON polls.id = poll_options.poll_id LEFT JOIN poll_votes ON poll_options.id = poll_votes.option_id LEFT JOIN users ON poll_votes.voter_id = users.id where polls.team_id= $1 and polls.channel_id =$2 and polls.is_closed = $3',
    [teamId, channelId, isClosed]).then((results) => {
        return results.rows;
    });
};

const getByIdWithResults = async (id) => {
    return db.query('SELECT *, poll_votes.id as poll_vote_id, poll_options.id as poll_options_id FROM polls INNER JOIN poll_options ON polls.id = poll_options.poll_id LEFT JOIN poll_votes ON poll_options.id = poll_votes.option_id LEFT JOIN users ON poll_votes.voter_id = users.id where polls.id= $1',
        [id]).then((results) => {
        return results.rows;
    });
};

const createPoll = async (request) => {
    const {
        pollTitle,
        isClosed,
        channelName,
        channelId,
        teamName,
        teamId,
        isGame,
        choices
    } = request;
    return db.query('INSERT INTO public.polls (poll_title, is_closed, channel_name, channel_id, team_name, team_id, is_game, choices)' +
        'VALUES($1, $2, $3, $4, $5, $6, $7, $8)',
        [pollTitle, isClosed, channelName, channelId, teamName, teamId, isGame, {}]).then((pollResults) => {
        return getByChannel({
            teamId: teamId,
            channelId: channelId,
            isClosed: false
        }).then(insertedPoll => {
            queryValues = 'VALUES';
            for (i = 0; i < choices.length; i++) {
                queryValues += '(' + insertedPoll.id + ',';
                queryValues += choices[i].index + ', \'';
                queryValues += choices[i].name + '\')';
                if (i < choices.length - 1) {
                    queryValues += ',';
                } else {
                    queryValues += ';';
                }
            }
            return db.query('INSERT INTO public.poll_options (poll_id, option_index, option_name)' + queryValues)
                .then(optionResults => {
                    logger.logInfo(JSON.stringify(optionResults));
                    return pollResults;
                });
        });
    });
};

const closePoll = async (req) => {
    logger.logInfo('Closing Poll: ' + JSON.stringify(req));
    const {
        teamId,
        channelId
    } = req;
    return db.query('UPDATE polls set is_closed = true, closed_date = now() where team_id = $1 and channel_id =$2 and is_closed = false returning * ',
            [teamId, channelId])
        .then((results) => {
            return results.rows[0].id;
        });
};

module.exports = {
    getAll,
    getByChannel,
    getByChannelWithResults,
    getByIdWithResults,
    createPoll,
    closePoll
};