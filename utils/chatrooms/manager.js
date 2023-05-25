const EventEmitter = require('events');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ChannelType, ButtonStyle } = require("discord.js");

module.exports = class ChatroomManager extends EventEmitter {
    /**
     * Create a ChatroomManager instance
     * @param {Object} client
     */
    constructor(client) {
        super();

        this.client = client;
    }

    /**
     * Create a new chatroom
     * @param {string} guild_id - The ID of the guild to create the chatroom in
     * @param {string} creator_id - The ID of the user to create the chatroom for
     * @param {string} category_id - The ID of the category to create the chatroom in
     */
    async create(guild_id, creator_id, category_id) {
        const guild = await this.client.guilds.fetch(guild_id); // Fetch the guild by ID
        const creator = await guild.members.fetch(creator_id); // Fetch the member by ID
        const category = await guild.channels.fetch(category_id); // Fetch the category by ID

        if (!category) throw new Error("Invalid chatroom category ID provided.");

        // Create the chatroom with specified properties
        const chatroom = await guild.channels.create({
            name: `chatroom-${creator.user.username}`.toLowerCase(),
            type: ChannelType.GuildText,
            parent: category.id,
            reason: `Chatroom created by ${creator.user.tag} (${creator.user.id})`,
        });

        // Create components for the chatroom
        const components = new ActionRowBuilder();
        components.addComponents(
            new ButtonBuilder()
                .setCustomId("chatroom.close")
                .setLabel("Close")
                .setEmoji("🔒")
                .setStyle(ButtonStyle.Danger)
        );

        // Send initial message with embed and components
        const initial_message = await chatroom.send({
            embeds: [
                new EmbedBuilder()
                    .setAuthor({ name: creator.user.tag, iconURL: creator.user.displayAvatarURL() })
                    .setDescription(`**${creator.user.username}** has created this chatroom. All messages sent here will be anonymous and relayed back to **${creator.user.username}**.`)
                    .setColor("#8B0000")
                    .setTimestamp()
                    .setFooter({ text: `Ghost Chat • Chatroom #`, iconURL: this.client.user.displayAvatarURL() })
            ],
            components: [components],
        });

        await initial_message.pin({ reason: "Chatroom initial message" }); // Pin the initial message

        const pinned = chatroom.messages.cache.last();

        if (pinned.system) {
            pinned
                .delete({ reason: "Chatroom system message" })
                .catch(() => this.client.logger.warn("Failed to delete chatroom system pin message."));
        }

        // Insert chatroom details into the database
        await this.client.query(
            "INSERT INTO rooms (guild_id, channel_id, creator_username, creator_discord_id, status) VALUES (?, ?, ?, ?, ?)",
            [guild.id, chatroom.id, creator.user.username, creator.user.id, 1]
        );

        this.client.logger.info(`Created chatroom #${chatroom.name} (${chatroom.id}) in ${guild.name} (${guild.id}) for ${creator.user.tag} (${creator.user.id})`);

        this.emit("chatroomCreate", chatroom, creator);

        return chatroom; // Return the created chatroom
    }

    async get(user_id) {
        try {
            // Search for open chatrooms in DB
            const result = await this.client.query(
                "SELECT r.*, rs.name " +
                "FROM rooms r " +
                "INNER JOIN room_statuses rs ON r.status = rs.id " +
                "WHERE r.creator_discord_id = ?",
                [user_id]
            );

            if (result.length > 0) {
                // If a chatroom is found, return the chatroom ID
                return result;
            } else {
                // If no chatroom is found, return null or any appropriate value
                return null;
            }
        } catch (error) {
            // Handle any errors that occur during the query
            console.error("Error retrieving chatroom:", error);
            return null;
        }
    }

    async close(chatroom_id) {
    }

    async reply(chatroom_id, message) {
    }
};