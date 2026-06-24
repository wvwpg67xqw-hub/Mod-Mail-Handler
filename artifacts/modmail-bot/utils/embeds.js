const { EmbedBuilder } = require('discord.js');

function userMessageEmbed(member, content) {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
    .setDescription(content)
    .setTimestamp()
    .setFooter({ text: `User ID: ${member.user.id}` });
}

function staffReplyEmbed(member, content) {
  return new EmbedBuilder()
    .setColor(0x57F287)
    .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
    .setDescription(content)
    .setTimestamp()
    .setFooter({ text: 'Staff Reply' });
}

function anonymousReplyEmbed(content) {
  return new EmbedBuilder()
    .setColor(0x57F287)
    .setAuthor({ name: 'Staff' })
    .setDescription(content)
    .setTimestamp()
    .setFooter({ text: 'Anonymous Staff Reply' });
}

function dmStaffReplyEmbed(content, anonymous) {
  return new EmbedBuilder()
    .setColor(0x57F287)
    .setAuthor({ name: anonymous ? 'Staff' : 'Staff Reply' })
    .setDescription(content)
    .setTimestamp();
}

function dmAnonReplyEmbed(content) {
  return new EmbedBuilder()
    .setColor(0x57F287)
    .setAuthor({ name: 'Staff' })
    .setDescription(content)
    .setTimestamp();
}

function closedEmbed(reason) {
  return new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('Modmail Closed')
    .setDescription(reason || 'Your modmail thread has been closed.')
    .setTimestamp();
}

function byeEmbed() {
  return new EmbedBuilder()
    .setColor(0xFEE75C)
    .setTitle('Goodbye!')
    .setDescription('Thanks for reaching out! Your modmail will be closed in **1 hour**. Feel free to open a new one if you need anything else.')
    .setTimestamp();
}

function openedEmbed(user) {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('New Modmail Thread')
    .setDescription(`Thread opened by **${user.tag}**`)
    .addFields(
      { name: 'User', value: `<@${user.id}>`, inline: true },
      { name: 'ID', value: user.id, inline: true },
      { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
    )
    .setThumbnail(user.displayAvatarURL())
    .setTimestamp();
}

module.exports = {
  userMessageEmbed, staffReplyEmbed, anonymousReplyEmbed,
  dmStaffReplyEmbed, dmAnonReplyEmbed, closedEmbed, byeEmbed, openedEmbed,
};
