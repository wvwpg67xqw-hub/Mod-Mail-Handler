require('dotenv').config();

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { handleDM } = require('./handlers/dm');
const { handleCommand } = require('./handlers/commands');
const storage = require('./utils/storage');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});

client.once('ready', () => {
  console.log(`✅ Modmail bot online as ${client.user.tag}`);
  console.log(`📬 Monitoring guild: ${process.env.GUILD_ID || 'NOT SET — add GUILD_ID to Secrets'}`);
  client.user.setPresence({
    activities: [{ name: 'your DMs | .setup', type: 3 }],
    status: 'online',
  });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (!message.guild) {
    await handleDM(message, client);
    return;
  }

  const thread = storage.getThreadByChannel(message.channel.id);
  const isSetupOrHelp = message.content.match(/^\.(setup|a|s|snippet)/i);

  if (thread || isSetupOrHelp) {
    await handleCommand(message, client);
  }
});

client.on('error', (err) => console.error('Discord client error:', err));
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ DISCORD_TOKEN is not set. Add it to your Replit Secrets and restart the bot.');
  process.exit(1);
}

client.login(token);
