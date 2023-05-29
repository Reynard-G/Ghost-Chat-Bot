const EventEmitter = require('events');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ChannelType, ButtonStyle } = require("discord.js");
const discordTranscripts = require('discord-html-transcripts');

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
     * 
     * @param {Number} guild_id - The Discord ID of the guild to create the chatroom in
     * @param {Number} creator_id - The Discord ID of the user to create the chatroom for
     * @param {Number} category_id - The Discord ID of the category to create the chatroom in
     * @returns {Number} - The ID of the chatroom
     * @throws {Error} - If the chatroom category ID is invalid
     * @async
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

        // Insert chatroom details into the database
        const res = await this.client.query(
            "INSERT INTO rooms (guild_id, channel_id, creator_username, creator_discord_id, status) " +
            "VALUES (?, ?, ?, ?, ?)",
            [guild.id, chatroom.id, creator.user.username, creator.user.id, 1]
        );

        // Insert chatroom participants into the database
        await this.client.query(
            "INSERT INTO room_participants (room_id, user_discord_id) " +
            "VALUES (?, ?)",
            [res.insertId, creator.user.id]
        );

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
                    .setFooter({ text: `Ghost Chat • Chatroom #${res.insertId}`, iconURL: this.client.user.displayAvatarURL() })
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

        this.client.logger.info(`Created chatroom #${chatroom.name} (${chatroom.id}) in ${guild.name} (${guild.id}) for ${creator.user.tag} (${creator.user.id})`);

        this.emit("chatroomCreate", chatroom, creator);

        return res.insertId; // Return the chatroom ID
    }

    /**
     * Gets a chatroom by ID, if it exists
     * 
     * @param {String} identifier - The data to search for the chatroom by
     * @param {String} searchType - The type of search to perform
     * @returns { Object | null } - The query result, or null if no chatroom is found
     * @async
     */
    async get(identifier, searchType) {
        try {
            let query = "";
            let params = [];

            switch (searchType) {
                case "id":
                    query = "SELECT r.*, rs.name AS status_name " +
                        "FROM rooms r " +
                        "INNER JOIN room_statuses rs ON r.status = rs.id " +
                        "WHERE r.id = ?";
                    params = [identifier];
                    break;
                case "creator":
                    query = "SELECT r.*, rs.name AS status_name " +
                        "FROM rooms r " +
                        "INNER JOIN room_statuses rs ON r.status = rs.id " +
                        "WHERE r.creator_discord_id = ?";
                    params = [identifier];
                    break;
                default:
                    throw new Error("Invalid search type provided.");
            }

            const result = await this.client.query(query, params);

            if (result.length > 0) {
                // If a chatroom is found, return the result
                return result;
            } else {
                // If no chatroom is found, return null or any appropriate value
                return null;
            }
        } catch (error) {
            // Handle any errors that occur during the query
            this.client.logger.error("Error getting chatroom:", error);
            return null;
        }
    }

    /**
     * Gets a chatroom by its Discord ID, if it exists
     * 
     * @param {String} chatroom_discord_id - The Discord ID of the chatroom to get
     * @returns { Object | null } - The query result, or null if no chatroom is found
     * @async
     */
    async creator(chatroom_discord_id) {
        try {
            // Search for the chatroom
            const result = await this.client.query(
                "SELECT creator_discord_id " +
                "FROM rooms " +
                "WHERE channel_id = ?",
                [chatroom_discord_id]
            );

            if (result.length > 0) {
                // If a creator is found, return the creator ID
                return result[0].creator_discord_id;
            } else {
                // If no creator is found, return null or any appropriate value
                return null;
            }
        } catch (error) {
            // Handle any errors that occur during the query
            this.client.logger.error("Error getting chatroom creator:", error);
            return null;
        }
    }

    /**
     * Closes a chatroom
     * 
     * @param {BigInt} chatroom_id - The Discord ID of the chatroom to close
     * @returns { Object | null } - The query result, or null if no chatroom is found
     * @async
     */
    async close(chatroom_id) {
        // Check if chatroom exists
        const chatroom = await this.get(chatroom_id, "id");

        if (!chatroom) {
            this.client.logger.warn(`Tried to close chatroom ${chatroom_id}, but it does not exist.`);
            return null;
        }

        // Check if chatroom is already closed
        if (chatroom[0].status == 3) {
            this.client.logger.warn(`Tried to close chatroom ${chatroom_id}, but it is already closed.`);
            return null;
        }

        // Get HTML transcript of chatroom
        const chatroomChannel = await this.client.channels.fetch(chatroom[0].channel_id);
        const transcript = await discordTranscripts.createTranscript(chatroomChannel,
            {
                limit: Infinity,
                filename: `${chatroomChannel.name} Transcript.html`,
                saveImages: true,
                footerText: "Exported {number} message(s)",
                poweredBy: false
            }
        );

        // Send transcript to all users involved
        const participants = await this.participants(chatroom_id);
        participants.forEach(async userID => {
            const user = await this.client.users.fetch(userID);
            user.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`Chatroom #${chatroomChannel.name} Closed`)
                        .setDescription(`The chatroom you were in has been closed. Here is a transcript of the chatroom:`)
                        .setColor("#8B0000")
                        .setTimestamp()
                        .setFooter({ text: `Ghost Chat • Chatroom #${chatroomChannel.name}`, iconURL: this.client.user.displayAvatarURL() })
                ],
                files: [transcript]
            });
        });

        // Rename chatroom channel
        const creator = await this.client.users.fetch(String(chatroom[0].creator_discord_id));
        chatroomChannel.setName(`closed-${creator.username}`);

        // Move chatroom channel to the closed chatrooms category
		const closedCategory = await this.client.channels.fetch(process.env.CHATROOM_CLOSED_CATEGORY_ID);
		await chatroomChannel.setParent(closedCategory);

        try {
            // Close chatroom
            this.client.query(
                "UPDATE rooms " +
                "SET status = 3 " +
                "WHERE id = ?",
                [chatroom_id]
            );

            this.client.logger.info(`Closed chatroom #${chatroomChannel.name} (${chatroomChannel.id})`);

        } catch (error) {
            // Handle any errors that occur during the query
            this.client.logger.error("Error closing chatroom:", error);
            return null;
        }
    }

    /**
     * Sends a message to a chatroom
     * 
     * @param {Object} interaction - The interaction object
     * @param {BigInt} chatroom_id - The Discord ID of the chatroom to send the message to
     * @param {String} user_id - The Discord ID of the user sending the message
     * @param {String} message - The message to send
     * @param {Boolean} anonymous - Whether or not the message should be sent anonymously
     * @returns { Object | null } - The sent message, or null if no chatroom is found
     * @async
     */
    async reply(chatroom_id, user_id, message, anonymous) {
        // Check if chatroom exists
        const chatroom = await this.get(chatroom_id, "id");
        
        if (!chatroom) {
            this.client.logger.warn(`Tried to reply to chatroom ${chatroom_id}, but it does not exist.`);
            return null;
        }

        // Check if the chatroom is "Closed"
        const status = this.client.query(
            "SELECT rooms.status, room_statuses.name " +
            "FROM rooms " +
            "INNER JOIN room_statuses ON rooms.status = room_statuses.id " +
            "WHERE rooms.channel_id = ?",
            [chatroom_id]
        );

        if (status.name === "Closed") {
            this.client.logger.warn(`Attempted to send a message to closed chatroom #${chatroom.name} (${chatroom.id}).`);
            return null;
        }

        // If the chatroom is "Opened", change the status to "In Progress"
        if (status.name === "Opened") {
            this.client.query(
                "UPDATE rooms " +
                "SET status = 2 " +
                "WHERE channel_id = ?",
                [chatroom_id]
            );
        }

        // If the user has not previously sent a message, log the user as one of the chatroom participants
        const participants = await this.participants(chatroom_id);
        const chatroomChannel = await this.client.channels.fetch(chatroom[0].channel_id);
        const user = await this.client.users.fetch(user_id);

        if (!participants.includes(Number(user_id))) {
            // Add user to the list of participants
            this.client.query(
                "INSERT INTO room_participants (room_id, user_discord_id) " +
                "VALUES (?, ?)",
                [chatroom_id, user_id]
            );

            this.client.logger.info(`Added ${user.tag} (${user.id}) as a participant to chatroom #${chatroomChannel.name} (${chatroomChannel.id})`);
        }

        // Send each participant the message
        const embed = anonymous ?
            new EmbedBuilder()
                .setAuthor({ name: "Anonymous", iconURL: "https://imgs.milklegend.xyz/anonymous.jpg" })
                .setDescription(message)
                .setColor("#808080")
                .setTimestamp()
                .setFooter({ text: `Ghost Chat • Chatroom #${chatroom_id}`, iconURL: this.client.user.displayAvatarURL() })
            : new EmbedBuilder()
                .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
                .setDescription(message)
                .setColor("Green")
                .setTimestamp()
                .setFooter({ text: `Ghost Chat • Chatroom #${chatroom_id}`, iconURL: this.client.user.displayAvatarURL() });

        // Send the message in the chatroom
        const sentChatroomMessage = await chatroomChannel.send({ embeds: [embed] });

        // Send the message in the creator's DMs
        const creator = await this.client.users.fetch(String(chatroom[0].creator_discord_id));
        const sentDMMessage = creator.send({ embeds: [embed] });

        // Return the message
        return sentChatroomMessage, sentDMMessage;
    }

    /**
     * Gets all participants in a chatroom
     * 
     * @param {BigInt} chatroom_id - The Discord ID of the chatroom to get the participants of
     * @returns { Array | null } - An array of Discord IDs of the participants, or null if no chatroom is found
     * @async
     */
    async participants(chatroom_id) {
        // Check if chatroom exists
        const chatroom = await this.get(chatroom_id, "id");

        if (!chatroom) {
            this.client.logger.warn(`Tried to get participants of chatroom ${chatroom_id}, but it does not exist.`);
            return null;
        }

        try {
            // Get all users involved in the chatroom
            const result = await this.client.query(
                "SELECT user_discord_id " +
                "FROM room_participants " +
                "WHERE room_id = ?"
                [chatroom_id]
            );

            // Map the users to an array
            const users = result.map(user => String(user.user_discord_id));

            // Return the users
            return users;
        } catch (error) {
            // Handle any errors that occur during the query
            this.client.logger.error("Error getting chatroom participants:", error);
            return null;
        }
    }
};