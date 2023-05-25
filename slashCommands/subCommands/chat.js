const { ApplicationCommandType, ApplicationCommandOptionType } = require("discord.js");

module.exports = {
    name: "chat",
    description: "Manage your chatrooms.",
    type: ApplicationCommandType.ChatInput,
    dm_permission: true,
    cooldown: 3000,
    options: [
        {
            name: "create",
            description: "Create a chatroom.",
            type: ApplicationCommandOptionType.Subcommand,
            cooldown: 3000,
        },
        {
            name: "reply",
            description: "Reply in a chatroom.",
            type: ApplicationCommandOptionType.Subcommand,
            cooldown: 3000,
        },
    ],
};