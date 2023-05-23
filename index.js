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
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.AutoModerationExecution,
    GatewayIntentBits.AutoModerationConfiguration
	],
});
client.login(config.BOT_TOKEN);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))


const sqlite3 = require('sqlite3').verbose();

// Open a database connection
const db = new sqlite3.Database('keybase_export.sqlite');
process.env.TZ='UTC'

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
  console.log(`Running sync_messages_for_topic for ${team_name} , ${topic_name}`)
  // Get number of keybase messages that need to be synced
  let num_keybase_messages = await get_keybase_topic_message_count(team_name, topic_name)
  // Check number of logs for this specific channel
  tmp_query = `
  SELECT count(*) as messages_synced FROM discord_message_logs_t 
  WHERE 
      keybase_team = '${team_name}'
      AND keybase_topic = '${topic_name}'
  LIMIT 40`
  tmp_result = await runSQL(tmp_query)
  var messages_synced = tmp_result[0].messages_synced
  if(messages_synced == num_keybase_messages){
    console.log(`Messages for ${team_name}.${topic_name} were already synced`)
    return false
  }
  // Get channel_id
  console.log("sync_messages_for_topic, Getting Channel ID")
  tmp_query = `
  SELECT * FROM discord_channel_logs_t 
  WHERE 
      keybase_team = '${team_name}'
      AND keybase_topic = '${topic_name}'
  LIMIT 40`
  tmp_result = await runSQL(tmp_query)
  if(tmp_result.length == 0){
    console.log(`Can't find channel_id for ${team_name}.${topic_name}`)
    return false
  }
  channel_id = tmp_result[0].discord_channel_id
  console.log(`channel_id = ${channel_id}`)
  const channel = guild.channels.cache.get(channel_id);
  for(; messages_synced < num_keybase_messages; messages_synced++){
    // Find message
    console.log(`messages_synced = ${messages_synced}`)
    tmp_query = `
    SELECT
      json_extract(message_json,'$.msg.sender.username')   as sender,
      json_extract(message_json,'$.msg.content.text.body') as body,
      json_extract(message_json,'$.msg.sent_at_ms')        as timestamp
    FROM team_messages_t
    WHERE 
      team_name         = '${team_name}'
      AND topic_name    = '${topic_name}'
      AND json_extract(message_json,'$.msg.content.type') = 'text'
    ORDER BY
      json_extract(message_json,'$.msg.sent_at') ASC
    LIMIT 1
    OFFSET ${messages_synced}`
    let result = await runSQL(tmp_query)
    // Send message
    

    // let member = guild.members.cache.get(client.user.id)
    // let changed_avatar = null
    // if(messages_synced%2 == 0){
    //   changed_avatar = await client.user.setAvatar('./discord-avatar-512-HWD4J.png')
    // }
    // else {
    //   changed_avatar = await client.user.setAvatar('./discord-avatar-512-WQ0IZ.png')
    // }
    // console.log("changed_avatar")
    // console.log(changed_avatar)
    // let changed_nickname = await member.setNickname(result[0].sender);
    // console.log(`Setting nickname ${changed_nickname}`)
    let msg_response = await channel.send(`From: ${result[0].sender} at ${new Date(result[0].timestamp).toString()}\n${result[0].body}`);
    // Log message to database
    tmp_query = `
    INSERT INTO discord_message_logs_t(
      keybase_team,
      keybase_topic,
      keybase_msg_id,
      discord_msg_id
      )
    VALUES ( '${team_name}', '${topic_name}', 
      ${messages_synced}, '${msg_response.id}')`
    tmp_result = await runSQL(tmp_query)    
    await delay(4000)
  }
}

const sync_topic = async (guild, team_name, topic_name) => {
  await create_category_for_team( guild, team_name)
  await create_channel_for_topic( guild, team_name, topic_name)
  await sync_messages_for_topic(  guild, team_name, topic_name)
}
const sync_team = async (guild, team_name) => {
  let team_topics = await runSQL(`
    SELECT distinct(topic_name) 
    FROM team_messages_t 
    WHERE team_name = '${team_name}'
  `)
  for(var j = 0; j < team_topics.length; j++){
    console.log(`Migrating ${team_name}.${team_topics[j].topic_name}`)
    await sync_topic(guild, team_name, team_topics[j].topic_name)
  }
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
		discord_channel_id      VARCHAR,
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
    await runSQL('DROP TABLE discord_channel_logs_t;')
    await runSQL('DROP TABLE discord_message_logs_t;')
    await runSQL(create_discord_channel_logs_t);
    await runSQL(create_discord_message_logs_t);
    // const result = await runSQL('SELECT * FROM teams_t');
    // let team_messages = await get_keybase_topic_message_count('dentropydaemon', 'ux')
    // console.log(team_messages)
    
    await sync_team(guild, 'complexadventure.april2023')

    
    // This is for syncing everything complexity related
    // let keybase_teams = await runSQL(`SELECT * FROM teams_t where team_name like '%complex%'`)
    // for(var i = 0; i < keybase_teams.length; i++){
    //   console.log(keybase_teams[i].team_name)
    //   await sync_team(guild, keybase_teams[i].team_name)
    // }



  } catch (error) {
    console.error(error.message);
  } finally {
    // Close the database connection
    db.close();
  }
});