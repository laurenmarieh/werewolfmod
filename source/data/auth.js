const { db } = require('../../dbConnection.js')
const logger = require('../../logFunctions')
db.connect().catch(error => {
  // Db Connect Throws errors even when it works,
  // It tries to authenticate with computer credentials before trying the .env credentials
  // console.log(error);
})

const createAuth = async req => {
  const { accessToken, scope, userId, teamName, teamId, bot } = req
  const { botUserId, botAccessToken } = bot
  return db
    .query(
      'INSERT INTO public.auth' +
        '(access_token, "scope", user_id, team_name, team_id, bot_user_id, bot_access_token)' +
        'VALUES($1, $2, $3, $4, $5, $6, $7)',
      [accessToken, scope, userId, teamName, teamId, botUserId, botAccessToken]
    )
    .then(results => {
      return results.rows
    })
}

const getAuth = async req => {
  const { team_id, team_domain } = req
  return db
    .query('SELECT * FROM public.auth where team_id= $1 and team_name=$2 LIMIT 1', [
      team_id,
      team_domain
    ])
    .then(results => {
      return results.rows[0]
    })
}

module.exports = {
  createAuth,
  getAuth
}
