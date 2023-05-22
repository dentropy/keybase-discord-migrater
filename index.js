const sqlite3 = require('sqlite3').verbose();

// Open a database connection
const db = new sqlite3.Database('keybase_export.sqlite');

// Function to perform the SELECT query
const runSQL = (sql_query) => {
  return new Promise((resolve, reject) => {
    db.all(sql_query, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const get_keybase_topic_message_count = async (team_name, topic_name) => {
  let tmp_query = `
  SELECT COUNT(*) AS msg_count FROM team_messages_t 
    WHERE 
        team_name = '${team_name}'
        AND topic_name = '${topic_name}'
        AND json_extract(message_json,'$.msg.content.type') = 'text'
    LIMIT 40`
  tmp_result = await runSQL(tmp_query)
  return tmp_result[0].msg_count
}


const create_category_for_team = async (team_name, topic_name) => {
  console.log("Working On")
  // Check log for category
  tmp_query = `
  SELECT * AS check FROM discord_channel_logs_t 
  WHERE 
      team_name = '${team_name}'
      AND topic_name = '${topic_name}'
      AND discord_channel_type = 4
  LIMIT 40`
  tmp_result = await runSQL(tmp_query)
  if (tmp_result.length != 0){
    return false
  } 
  // Create category on discord


  // Log to database
  tmp_insert_query = `
  INSERT INTO discord_channel_logs_t
  SET
    team_name  = '${team_name}',
    topic_name = '${topic_name}',
    discord_category = 'test',
    discord_channel_type = 4`
}

const create_channel_for_topic = async (team_name, topic_name) => {
  console.log("Working On")
  // Get category_id in database from logs
  // Check if text channel category was already created
  // Create text channel under category
  // Log that text channel was created in logs
}

const sync_messages_for_topic = async (team_name, topic_name) => {
  console.log("Working On")
  // Get number of keybase messages that need to sync
  // Check number of logs for this specific channel
  // Loop for sending remaining messages
    // Send message
    // Log message
    // delay 1000
}

const sync_topic = async (team_name, topic_name) => {
  await create_category_for_team( team_name, topic_name)
  // await create_channel_for_topic( team_name, topic_name)
  // await sync_messages_for_topic(  team_name, topic_name)
}
const sync_team = async (team_name) => {
  console.log("Working On")
}

// https://discord.com/developers/docs/resources/channel#channel-object-channel-types
let create_discord_channel_logs_t = `
CREATE TABLE IF NOT EXISTS
	discord_channel_logs_t(
		keybase_team            VARCHAR,
		keybase_topic           VARCHAR,
		keybase_conversation_id VARCHAR,
		discord_category_id     VARCHAR,
		discord_channel_type    INT
	);`

let = create_discord_message_logs_t = `
CREATE TABLE IF NOT EXISTS
	discord_message_logs_t(
		keybase_team            VARCHAR,
		keybase_topic           VARCHAR,
		keybase_conversation_id VARCHAR,
		keybase_msg_id          INT,
		discord_channel         VARCHAR,
		discord_msg_id          VARCHAR
	);`



// Main function using async/await
const main = async () => {
  try {
    // Perform the SELECT query and store the result in a variable
    await runSQL(create_discord_channel_logs_t);
    await runSQL(create_discord_message_logs_t);
    // const result = await runSQL('SELECT * FROM teams_t');
    // let team_messages = await get_keybase_topic_message_count('dentropydaemon', 'ux')
    // console.log(team_messages)

    let team_name  = 'dentropydaemon'
    let topic_name = 'ux'
    sync_topic(team_name, topic_name)



  } catch (error) {
    console.error(error.message);
  } finally {
    // Close the database connection
    db.close();
  }
};

// Call the main function
main();