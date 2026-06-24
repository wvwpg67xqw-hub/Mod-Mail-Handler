const storage = require('../utils/storage');
const {
  staffReplyEmbed, anonymousReplyEmbed, dmStaffReplyEmbed,
  dmAnonReplyEmbed, closedEmbed, byeEmbed,
} = require('../utils/embeds');

const PREFIX = '.';
const byeTimers = new Map();

async function hasAccess(member, config) {
  if (!config.accessRoleId) return member.permissions.has('ManageMessages');
  return member.roles.cache.has(config.accessRoleId) || member.permissions.has('Administrator');
}

async function handleCommand(message, client) {
  if (!message.content.startsWith(PREFIX)) {
    // Plain message in modmail channel → forward to user
    await forwardToUser(message, client, false);
    return;
  }

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();
  const config = storage.getConfig();

  if (!(await hasAccess(message.member, config))) {
    return message.reply('❌ You do not have permission to use modmail commands.');
  }

  const thread = storage.getThreadByChannel(message.channel.id);
  if (!thread && !['setup', 'a', 's', 'snippet'].includes(command)) {
    return message.reply('❌ This channel is not an active modmail thread.');
  }

  switch (command) {
    case 'ar':
      await cmdAnonReply(message, client, args, thread);
      break;
    case 'close':
      await cmdClose(message, client, thread);
      break;
    case 'bye':
      await cmdBye(message, client, thread);
      break;
    case 'setup':
      await cmdSetup(message, args, client);
      break;
    case 'a':
      await cmdHelp(message);
      break;
    case 's':
      await cmdListSnippets(message);
      break;
    case 'snippet':
      await cmdSnippet(message, client, args, thread);
      break;
    default:
      // Check if it's a snippet shortcut: .snippetname
      const snippet = storage.getSnippet(command);
      if (snippet && thread) {
        await sendSnippet(message, client, snippet, thread);
      }
      break;
  }
}

async function forwardToUser(message, client, anonymous) {
  const thread = storage.getThreadByChannel(message.channel.id);
  if (!thread) return;

  try {
    const user = await client.users.fetch(thread.userId);
    if (anonymous) {
      await user.send({ embeds: [dmAnonReplyEmbed(message.content.slice('.ar'.length + 1))] });
      await message.channel.send({ embeds: [anonymousReplyEmbed(message.content.slice('.ar'.length + 1))] });
    } else {
      await user.send({ embeds: [dmStaffReplyEmbed(message.content, false)] });
      await message.channel.send({ embeds: [staffReplyEmbed(message.member, message.content)] });
    }
    await message.delete().catch(() => {});
  } catch (err) {
    console.error('Error forwarding message:', err);
    message.reply('❌ Could not send message to the user.');
  }
}

async function cmdAnonReply(message, client, args, thread) {
  const content = args.join(' ');
  if (!content) return message.reply('❌ Usage: `.ar <message>`');
  if (!thread) return message.reply('❌ This channel is not an active modmail thread.');

  try {
    const user = await client.users.fetch(thread.userId);
    await user.send({ embeds: [dmAnonReplyEmbed(content)] });
    await message.channel.send({ embeds: [anonymousReplyEmbed(content)] });
    await message.delete().catch(() => {});
  } catch (err) {
    console.error('Error sending anon reply:', err);
    message.reply('❌ Could not send the anonymous reply.');
  }
}

async function cmdClose(message, client, thread) {
  if (!thread) return message.reply('❌ This channel is not an active modmail thread.');

  try {
    const user = await client.users.fetch(thread.userId).catch(() => null);
    if (user) await user.send({ embeds: [closedEmbed('Your modmail thread has been closed by a staff member.')] });

    storage.deleteThread(message.channel.id);
    await message.channel.send('🔒 Thread closed. Deleting channel in 5 seconds...');
    setTimeout(() => message.channel.delete().catch(() => {}), 5000);
  } catch (err) {
    console.error('Error closing thread:', err);
    message.reply('❌ There was an error closing the thread.');
  }
}

async function cmdBye(message, client, thread) {
  if (!thread) return message.reply('❌ This channel is not an active modmail thread.');

  try {
    const user = await client.users.fetch(thread.userId).catch(() => null);
    if (user) await user.send({ embeds: [byeEmbed()] });

    await message.channel.send('👋 Bye message sent. This thread will be **closed in 1 hour**.');

    // Cancel any existing timer for this channel
    if (byeTimers.has(message.channel.id)) {
      clearTimeout(byeTimers.get(message.channel.id));
    }

    const timer = setTimeout(async () => {
      byeTimers.delete(message.channel.id);
      const stillExists = storage.getThreadByChannel(message.channel.id);
      if (!stillExists) return;

      if (user) {
        await user.send({ embeds: [closedEmbed('Your modmail thread has been automatically closed.')] }).catch(() => {});
      }
      storage.deleteThread(message.channel.id);
      await message.channel.send('🔒 Auto-closing thread now...').catch(() => {});
      setTimeout(() => message.channel.delete().catch(() => {}), 3000);
    }, 60 * 60 * 1000); // 1 hour

    byeTimers.set(message.channel.id, timer);
  } catch (err) {
    console.error('Error sending bye message:', err);
    message.reply('❌ There was an error sending the bye message.');
  }
}

async function cmdSetup(message, args, client) {
  if (!message.member.permissions.has('Administrator')) {
    return message.reply('❌ Only Administrators can use `.setup`.');
  }

  const embed = {
    color: 0x5865F2,
    title: '⚙️ Modmail Setup',
    description: [
      'React or reply with the setup option you want to configure:',
      '',
      '**1️⃣** — Set **ping role** (role pinged when a new modmail opens)',
      '**2️⃣** — Set **access role** (role that can use modmail commands)',
      '**3️⃣** — Set **modmail category** (where channels are created)',
      '**4️⃣** — View current config',
    ].join('\n'),
  };

  const setupMsg = await message.channel.send({ embeds: [embed] });
  await setupMsg.react('1️⃣');
  await setupMsg.react('2️⃣');
  await setupMsg.react('3️⃣');
  await setupMsg.react('4️⃣');

  const filter = (reaction, user) =>
    ['1️⃣', '2️⃣', '3️⃣', '4️⃣'].includes(reaction.emoji.name) && user.id === message.author.id;

  const collector = setupMsg.createReactionCollector({ filter, time: 30000, max: 1 });

  collector.on('collect', async (reaction) => {
    const choice = reaction.emoji.name;
    const config = storage.getConfig();

    if (choice === '4️⃣') {
      return message.channel.send({
        embeds: [{
          color: 0x5865F2,
          title: '📋 Current Config',
          fields: [
            { name: 'Ping Role', value: config.pingRoleId ? `<@&${config.pingRoleId}>` : 'Not set', inline: true },
            { name: 'Access Role', value: config.accessRoleId ? `<@&${config.accessRoleId}>` : 'Not set (Manage Messages)', inline: true },
            { name: 'Category', value: config.categoryId ? `<#${config.categoryId}>` : 'Not set (root)', inline: true },
          ],
        }],
      });
    }

    const prompts = {
      '1️⃣': 'Mention the **ping role** (e.g. `@Mods`):',
      '2️⃣': 'Mention the **access role** (e.g. `@Staff`):',
      '3️⃣': 'Send the **category channel ID** where modmail threads will be created:',
    };

    await message.channel.send(prompts[choice]);

    const msgFilter = m => m.author.id === message.author.id;
    const collected = await message.channel.awaitMessages({ filter: msgFilter, max: 1, time: 30000 });

    if (!collected.size) return message.channel.send('❌ Setup timed out.');

    const response = collected.first();

    if (choice === '1️⃣') {
      const role = response.mentions.roles.first();
      if (!role) return message.channel.send('❌ No role mentioned.');
      storage.setConfig({ pingRoleId: role.id });
      message.channel.send(`✅ Ping role set to **${role.name}**.`);
    } else if (choice === '2️⃣') {
      const role = response.mentions.roles.first();
      if (!role) return message.channel.send('❌ No role mentioned.');
      storage.setConfig({ accessRoleId: role.id });
      message.channel.send(`✅ Access role set to **${role.name}**.`);
    } else if (choice === '3️⃣') {
      const catId = response.content.trim();
      const cat = message.guild.channels.cache.get(catId);
      if (!cat) return message.channel.send('❌ Category not found. Make sure you sent the correct ID.');
      storage.setConfig({ categoryId: catId });
      message.channel.send(`✅ Modmail category set to **${cat.name}**.`);
    }
  });

  collector.on('end', (collected) => {
    if (!collected.size) setupMsg.edit({ content: '⏰ Setup timed out.', embeds: [] }).catch(() => {});
  });
}

async function cmdHelp(message) {
  const snippets = storage.getSnippets();
  const snippetList = Object.keys(snippets);

  const embed = {
    color: 0x5865F2,
    title: '📖 Modmail Commands & Snippets',
    fields: [
      {
        name: '📨 Replies',
        value: [
          '`[message]` — Reply to user (with your name)',
          '`.ar <message>` — Anonymous reply (no name shown)',
        ].join('\n'),
      },
      {
        name: '🔖 Snippets',
        value: [
          '`.s` — List all snippets',
          '`.snippet <name>` — Use a snippet',
          '`.snippet add <name> <content>` — Add a snippet',
          '`.snippet remove <name>` — Remove a snippet',
        ].join('\n'),
      },
      {
        name: '🔒 Thread',
        value: [
          '`.close` — Close this thread immediately',
          '`.bye` — Send bye message & close in 1 hour',
        ].join('\n'),
      },
      {
        name: '⚙️ Admin',
        value: '`.setup` — Configure ping role, access role, and category',
      },
      {
        name: `📝 Saved Snippets (${snippetList.length})`,
        value: snippetList.length
          ? snippetList.map(n => `\`.${n}\``).join(', ')
          : 'No snippets saved yet. Use `.snippet add <name> <content>`.',
      },
    ],
  };

  message.channel.send({ embeds: [embed] });
}

async function cmdListSnippets(message) {
  const snippets = storage.getSnippets();
  const entries = Object.entries(snippets);

  if (!entries.length) {
    return message.channel.send('📝 No snippets saved yet. Add one with `.snippet add <name> <content>`.');
  }

  const embed = {
    color: 0x5865F2,
    title: `📝 Snippets (${entries.length})`,
    description: entries.map(([name, content]) => `**\`.${name}\`**\n${content}`).join('\n\n'),
  };

  message.channel.send({ embeds: [embed] });
}

async function cmdSnippet(message, client, args, thread) {
  const sub = args.shift()?.toLowerCase();

  if (!sub) return message.reply('❌ Usage: `.snippet <name>` | `.snippet add <name> <content>` | `.snippet remove <name>`');

  if (sub === 'add') {
    const name = args.shift()?.toLowerCase();
    const content = args.join(' ');
    if (!name || !content) return message.reply('❌ Usage: `.snippet add <name> <content>`');
    storage.addSnippet(name, content);
    return message.reply(`✅ Snippet **\`.${name}\`** saved.`);
  }

  if (sub === 'remove') {
    const name = args.shift()?.toLowerCase();
    if (!name) return message.reply('❌ Usage: `.snippet remove <name>`');
    const existing = storage.getSnippet(name);
    if (!existing) return message.reply(`❌ Snippet **\`.${name}\`** not found.`);
    storage.removeSnippet(name);
    return message.reply(`✅ Snippet **\`.${name}\`** removed.`);
  }

  // Use snippet by name
  const snippet = storage.getSnippet(sub);
  if (!snippet) return message.reply(`❌ Snippet **\`.${sub}\`** not found. Use \`.s\` to see all snippets.`);
  if (!thread) return message.reply('❌ This channel is not an active modmail thread.');

  await sendSnippet(message, client, snippet, thread);
}

async function sendSnippet(message, client, content, thread) {
  try {
    const user = await client.users.fetch(thread.userId);
    await user.send({ embeds: [dmStaffReplyEmbed(content, false)] });
    await message.channel.send({ embeds: [staffReplyEmbed(message.member, content)] });
    await message.delete().catch(() => {});
  } catch (err) {
    console.error('Error sending snippet:', err);
    message.reply('❌ Could not send the snippet to the user.');
  }
}

module.exports = { handleCommand };
