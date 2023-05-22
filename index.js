const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const config = require("./config.json");

const client = new Client({
  intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildEmojisAndStickers
	],
});
client.login(config.BOT_TOKEN);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))


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

const get_keybase_topic_message_count = async (guild, team_name, topic_name) => {
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


const create_category_for_team = async (guild, team_name) => {
  console.log(`Running create_category_for_team for ${team_name}`)
  // Check log for category
  tmp_query = `
  SELECT * FROM discord_channel_logs_t 
  WHERE 
      keybase_team = '${team_name}'
      AND discord_channel_type = 4
  LIMIT 40`
  tmp_result = await runSQL(tmp_query)  
  if (tmp_result.length != 0){
    console.log(`Category for ${team_name} was already added to discord guild`)
    return false
  } 
  // Create category on discord
  console.log(tmp_result)
  let category = await guild.channels.create({
    name: team_name,
    type: ChannelType.GuildCategory,
  });
  // Log to database
  tmp_query = `
  INSERT INTO discord_channel_logs_t(keybase_team,discord_category_id,discord_channel_type)
  VALUES ( '${team_name}', '${category.id}', 4)`
  tmp_result = await runSQL(tmp_query)
}

const create_channel_for_topic = async (guild, team_name, topic_name) => {
  // Check if text channel category was already created
  // Create text channel under category
  // Log that text channel was created in logs
  console.log(`Running create_channel_for_topic for ${team_name} , ${topic_name}`)
  // Get category_id in database from logs
  tmp_query = `
  SELECT * FROM discord_channel_logs_t 
  WHERE 
      keybase_team = '${team_name}'
      AND discord_channel_type = 4
  LIMIT 40`
  tmp_result = await runSQL(tmp_query)
  if (tmp_result.length == 0){
    return false // #TODO
  } 
  category_id = tmp_result[0].discord_category_id
  // Check if text channel category was already created
  tmp_query = `
  SELECT * FROM discord_channel_logs_t 
  WHERE 
      keybase_team = '${team_name}'
      AND keybase_topic = '${topic_name}'
      AND discord_channel_type = 0
  LIMIT 40`
  tmp_result = await runSQL(tmp_query)
  if (tmp_result.length != 0){
    console.log(`Channel for ${team_name}.${topic_name} was already added to discord guild`)
    return false
  } 
  // Create category on discord
  console.log(tmp_result)
  let channel = await guild.channels.create({
    name: topic_name,
    type: ChannelType.GuildText,
    parent: category_id
  });
  // Log to database
  tmp_query = `
  INSERT INTO discord_channel_logs_t(
    keybase_team,
    keybase_topic,
    discord_category_id,
    discord_channel_type,
    discord_channel_id
    )
  VALUES ( '${team_name}', '${topic_name}', 
    '${category_id}', 0, '${channel.id}')`
  tmp_result = await runSQL(tmp_query)
}

const sync_messages_for_topic = async (guild, team_name, topic_name) => {
  console.log("Working On")
  // Get number of keybase messages that need to sync
  // Check number of logs for this specific channel
  // Loop for sending remaining messages
    // Send message
    // Log message
    // delay 1000
}

const sync_topic = async (guild, team_name, topic_name) => {
  await create_category_for_team( guild, team_name)
  await create_channel_for_topic( guild, team_name, topic_name)
  // await sync_messages_for_topic(  guild, team_name, topic_name)
}
const sync_team = async (team_name) => {
  console.log("Working On")
}

// https://discord.com/developers/docs/resources/channel#channel-object-channel-types
let create_discord_channel_logs_t = `
CREATE TABLE IF NOT EXISTS
	discord_channel_logs_t(
		keybase_team               VARCHAR,
		keybase_topic              VARCHAR,
		keybase_conversation_id    VARCHAR,
		discord_category_id        VARCHAR,
    discord_channel_id         VARCHAR,
		discord_channel_type       INT
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
// const main = async () => {
//   try {
//     // Perform the SELECT query and store the result in a variable
//     await runSQL(create_discord_channel_logs_t);
//     await runSQL(create_discord_message_logs_t);
//     // const result = await runSQL('SELECT * FROM teams_t');
//     // let team_messages = await get_keybase_topic_message_count('dentropydaemon', 'ux')
//     // console.log(team_messages)

//     let team_name  = 'dentropydaemon'
//     let topic_name = 'ux'
//     sync_topic(team_name, topic_name)



//   } catch (error) {
//     console.error(error.message);
//   } finally {
//     // Close the database connection
//     db.close();
//   }
// };


client.once('ready', async () => {
  console.log('Bot is ready!');

  // Replace 'GUILD_ID' with the ID of the guild you want to retrieve the categories from
  const guildId = config.guildId;
  const guild = client.guilds.cache.get(guildId);

  // let category = await guild.channels.create({
  //   name: "test category",
  //   type: ChannelType.GuildCategory,
  // });
  // console.log(category)
  // await delay(3000)
  // let text_channel = await guild.channels.create({
  //   name: "test text channel",
  //   type: ChannelType.GuildText,
  //   parent: category.id
  // });
  // console.log(text_channel)
  try {
    // Perform the SELECT query and store the result in a variable
    // await runSQL('DROP TABLE discord_channel_logs_t;')
    // await runSQL('DROP TABLE discord_message_logs_t;')
    await runSQL(create_discord_channel_logs_t);
    await runSQL(create_discord_message_logs_t);
    // const result = await runSQL('SELECT * FROM teams_t');
    // let team_messages = await get_keybase_topic_message_count('dentropydaemon', 'ux')
    // console.log(team_messages)

    let team_name  = 'dentropydaemon'
    let topic_name = 'ux'
    await sync_topic(guild, team_name, topic_name)



  } catch (error) {
    console.error(error.message);
  } finally {
    // Close the database connection
    db.close();
  }
});