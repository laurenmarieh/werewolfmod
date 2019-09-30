const { db } = require('../../dbConnection.js');
const logger = require('../../logFunctions');
db.connect()
    .catch(error => {
        // Db Connect Throws errors even when it works, 
        // It tries to authenticate with computer credentials before trying the .env credentials
        // console.log(error);
});

const getGame = async (req) => {
    const {
        playerId,
        teamId
    } = req;
    return db.query('SELECT * FROM public.games where team_id= $1 and player_id=$2 LIMIT 1',
        [teamId, playerId]).then((results) => {
        return results.rows[0];
    });
};

const insertGame = async (req) => {
    const {
        game_name,
        team_name,
        team_id,
        channel_name,
        channel_id,
        is_running
    } = req;
    return db.query('INSERT INTO public.games' +
            '(game_name, workspace, team_id, channel_name, channel_id, is_running, current_day)' +
            'VALUES($1, $2, $3, $4, $5, $6, $7) returning id',
            [game_name, team_name, team_id, channel_name, channel_id, is_running, 0])
        .then((results) => {
            return results.rows;
        });
}


module.exports = {
    getGame,
    insertGame
};