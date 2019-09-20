const { db } = require('../../dbConnection.js')
const logger = require('../../logFunctions')
db.connect().catch(error => {
  // Db Connect Throws errors even when it works,
  // It tries to authenticate with computer credentials before trying the .env credentials
  // console.log(error);
})

const insertVote = async req => {
  const { optionId, voterId } = req
  return db
    .query('INSERT INTO public.poll_votes' + '(option_id, voter_id)' + 'VALUES($1, $2)', [
      optionId,
      voterId
    ])
    .then(results => {
      return results.rows
    })
}

const deactivateVote = async req => {
  return db
    .query('UPDATE poll_votes set is_active = $1 where id = $2', [false, req])
    .then(results => {
      return results
    })
}

const removeVote = async req => {
  const { pollId, playerId } = req
  return db
    .query(
      'UPDATE poll_votes set is_active = $1 WHERE id = (SELECT poll_votes.id FROM poll_options INNER JOIN poll_votes ON poll_options.id = poll_votes.option_id INNER JOIN users ON users.id = poll_votes.voter_id WHERE poll_options.poll_id = $2 AND users.player_id = $3 AND poll_votes.is_active LIMIT 1)',
      [false, pollId, playerId]
    )
    .then(results => {
      return results
    })
}

module.exports = {
  deactivateVote,
  insertVote,
  removeVote
}
