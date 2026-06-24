const { ChannelType, PermissionFlagsBits } = require('discord.js');
const storage = require('../utils/storage');
const { userMessageEmbed, openedEmbed } = require('../utils/embeds');

async function handleDM(message, client) {
  if (message.author.bot) return;

  const config = storage.getConfig();
  const guildId = process.env.GUILD_ID;

  if (!guildId) {
    return message.reply('❌ Bot is not configured yet. Please ask a staff member to run `.setup`.');
  }

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return message.reply('❌ Could not find the server. Please contact a staff member.');

  let thread = storage.getThreadByUser(message.author.id);
  if (thread) {
    const channel = guild.channels.cache.get(thread.channelId);
    if (channel) {
      await channel.send({ embeds: [userMessageEmbed({ user: message.author }, message.content)] });
      await message.react('✅');
      return;
    } else {
      storage.deleteThread(thread.channelId);
      thread = null;
    }
  }

  try {
    let category = null;
    if (config.categoryId) {
      category = guild.channels.cache.get(config.categoryId);
    }

    const channelName = `modmail-${message.author.username.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category || null,
      topic: `Modmail thread for ${message.author.tag} (${message.author.id})`,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        ...(config.accessRoleId ? [{
          id: config.accessRoleId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        }] : []),
      ],
    });

    storage.createThread(channel.id, message.author.id, message.author.tag);

    await channel.send({ embeds: [openedEmbed(message.author)] });
    await channel.send({ embeds: [userMessageEmbed({ user: message.author }, message.content)] });

    if (config.pingRoleId) {
      await channel.send(`<@&${config.pingRoleId}> — New modmail thread opened.`);
    }

    await message.reply('✅ Your message has been sent to the staff team. We will get back to you shortly!');
  } catch (err) {
    console.error('Error creating modmail thread:', err);
    await message.reply('❌ There was an error creating your modmail thread. Please try again later.');
  }
}

module.exports = { handleDM };
