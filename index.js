const Discord = require("discord.js");
const client = new Discord.Client({
  intents: ["GUILDS", "GUILD_MEMBERS", "GUILD_INVITES"],
});
const config = require("./config.json");
const { MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");
const { startServer } = require("./alive.js");

const invites = new Map();

// Function to fetch and map invites for a guild
const fetchGuildInvites = async (guild) => {
  try {
    const fetchedInvites = await guild.invites.fetch();
    const inviteMap = new Map();
    fetchedInvites.forEach((invite) => {
      inviteMap.set(invite.code, invite.uses);
    });
    invites.set(guild.id, inviteMap);
    console.log(`Loaded ${fetchedInvites.size} invites for guild: ${guild.name}`);
  } catch (err) {
    console.error(`Failed to load invites for guild: ${guild.name}`, err);
  }
};

client.once("ready", async () => {
  console.log("Bot is online!");
  console.log("GRT");
  console.log("https://discord.gg/mTjRrejcev");

  // Fetch invites for all guilds on bot startup
  client.guilds.cache.forEach((guild) => {
    fetchGuildInvites(guild);
  });
});

client.on("inviteCreate", (invite) => {
  const guildInvites = invites.get(invite.guild.id);
  if (guildInvites) {
    guildInvites.set(invite.code, invite.uses);
  }
});

client.on("inviteDelete", (invite) => {
  const guildInvites = invites.get(invite.guild.id);
  if (guildInvites) {
    guildInvites.delete(invite.code);
  }
});

client.on("guildMemberAdd", async (member) => {
  const welcomeChannel = member.guild.channels.cache.get(config.welcomeChannelId);
  const autoRole = member.guild.roles.cache.get(config.autoRoleId);

  try {
    // Add auto role if specified in config
    if (autoRole) {
      await member.roles.add(autoRole);
    } else {
      console.log("Auto role not found in config.json");
    }

    // Fetch current invites to track join information
    const newInvites = await member.guild.invites.fetch();
    const usedInvite = newInvites.find((inv) => {
      const prevUses = invites.get(member.guild.id).get(inv.code) || 0;
      return inv.uses > prevUses;
    });

    let inviterMention = "Unknown";
    if (usedInvite && usedInvite.inviter) {
      inviterMention = `<@${usedInvite.inviter.id}>`;
      console.log(`Member joined with invite code ${usedInvite.code}, invited by ${inviterMention}`);
    } else {
      console.log(`Member joined, but no matching invite was found.`);
    }

    // Fetch full user details
    const fullUser = await client.users.fetch(member.user.id, { force: true });

    // Construct welcome embed with member information
    const welcomeEmbed = new MessageEmbed()
      .setColor("#09ff00")
      .setTitle("مرحب بكم في السيرفر")
      .setDescription(`Hello ${member}, welcome to **${member.guild.name}**! Enjoy your stay.`)
      .addFields(
        { name: "Username", value: member.user.tag, inline: true },
        { name: "Invited By", value: inviterMention, inline: true },
        { name: "Invite Used", value: usedInvite ? `||${usedInvite.code}||` : "Direct Join", inline: true },
        { name: "Member Count", value: `${member.guild.memberCount}`, inline: true },
        { name: "Rules", value: "<#783840601799000094>", inline: false },
        { name: "Support", value: "<#1253306302474621048>", inline: false }
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setImage(config.logoUrl)  // Add server logo as main image
      .setFooter({ text: `${config.welcomeFooterText} | Code by GHERNAT FETHI`, iconURL: config.logoUrl })  // Update setFooter to use object
      .setTimestamp();

    // Add banner image if available
    const bannerUrl = fullUser.bannerURL({ dynamic: true, format: "png", size: 1024 });
    if (bannerUrl) {
      welcomeEmbed.setImage(bannerUrl);
    }

    // Add second welcome image if specified
    if (config.welcomeImageUrl) {
      welcomeEmbed.addFields({ name: '\u200b', value: '\u200b' });  // Add a blank field for spacing
      welcomeEmbed.setImage(config.welcomeImageUrl);
    }

    // Create row of buttons for additional links
    const row = new MessageActionRow().addComponents(
      new MessageButton()
        .setStyle("LINK")
        .setURL("https://2u.pw/xXcZgVXS")
        .setLabel("YouTube")
        .setEmoji("1158819353953828984"),
      new MessageButton()
        .setStyle("LINK")
        .setURL("https://bit.ly/3XDhpDk")
        .setLabel("Facebook")
        .setEmoji("1255665203207471145"),
      new MessageButton()
        .setStyle("LINK")
        .setURL("https://2u.pw/xXcZgVXS")
        .setLabel("Steam")
        .setEmoji("1255664680224161893")
    );

    // Send welcome message with embed and buttons
    if (welcomeChannel) {
      welcomeChannel.send({ embeds: [welcomeEmbed], components: [row] });
    } else {
      console.error("Welcome channel not found");
    }

    // Update stored invites for the guild
    invites.set(member.guild.id, new Map(newInvites.map((invite) => [invite.code, invite.uses])));
  } catch (err) {
    console.error("Error handling guild member add event:", err);
  }
});

client.on("guildMemberRemove", async (member) => {
  const leaveChannel = member.guild.channels.cache.get(config.leaveChannelId);

  try {
    const leaveEmbed = new MessageEmbed()
      .setColor("#ff0000")
      .setTitle("Member Left")
      .setDescription(`Sad to see you leave, ${member.user.tag}!`)
      .setThumbnail(config.leaveLogoUrl)  // Add leave logo as thumbnail
      .setImage(config.leaveImageUrl)  // Add leave image
      .setFooter({ text: `${config.leaveFooterText} | Code by GHERNAT FETHI`, iconURL: config.logoUrl })  // Update setFooter to use object
      .setTimestamp();

    if (leaveChannel) {
      leaveChannel.send({ embeds: [leaveEmbed] });
    } else {
      console.error("Leave channel not found");
    }
  } catch (err) {
    console.error("Error sending leave message:", err);
  }
});

// Start your server (assuming this function is correctly defined in alive.js)
startServer();

// Login to Discord with your bot token
client.login(process.env.TOKEN);
