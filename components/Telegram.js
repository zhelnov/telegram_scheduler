const Component = require('./Component');

module.exports = class Telegram extends Component {

	init() {
		this.runPolling();
	}

	async runPolling() {
		let lastUpdateId = await this.ioc.Storage.getVar('lastUpdateId');
		const updates = await this.ioc.TelegramApi.getUpdates(Number(lastUpdateId) + 1);
		const count = updates.length;

		if (count) {
			lastUpdateId = updates[count - 1].update_id;
			await this.ioc.Storage.setVar('lastUpdateId', lastUpdateId);
		}

		for (const update of updates) {
			const { update_id, message, callback_query } = update;

			if (callback_query) {
				const {
					from: { id: user_id, username },
					message: { message_id, chat: { username: channelName } },
					data: reaction,
				} = callback_query;
				const channel = `@${channelName}`;

				await this.ioc.Storage.setReaction({
					update_id, message_id, reaction, username, user_id, channel,
				});

				const { like, dislike } = await this.ioc.Storage.getReactions(message_id, channel);
				const { ok, description } = await this.ioc.TelegramApi.for(channel).editMessageReplyMarkup({
					message_id,
					reply_markup: this.getReactionLayout(like, dislike, channel),
				});

				if (!ok) {
					this.log('telegram error', description);
				}
			}
			if (message) {
				const channelConf = this.findChannelByPoster(message.from.id);

				if (!channelConf) {
					this.log('unauthorized', JSON.stringify(message));
					continue;
				} 
				if (message.entities) {
					await this.handleCommand(message);
				}
				if (message && Array.isArray(message.photo)) {
					const { chatId: channel } = channelConf; 
					const file = this.getLargestImgId(message.photo);
					const dbPayload = {
						update_id,
						channel,
						update: JSON.stringify(update),
						file_id: file,
						poster: message.chat.username || `${message.chat.first_name || '_'} ${message.chat.last_name || '_'}`,
						source: message.forward_from_chat && message.forward_from_chat.username,
						date: message.date,
					};
					const saveResult = await this.ioc.Storage.saveUpdate(dbPayload);

					if (!saveResult) {
						this.log('update save error', JSON.stringify(dbPayload));
					}
				}
			}
		}

		return this.runPolling();
	}

	async handleCommand({ from: { id }, text, entities }) {
		const commands = entities.filter(({ type }) => type === 'bot_command');

		for (const { offset, length } of commands) {
			const command = text.substr(offset + 1, length - 1);

			switch(command) {
			case 'stat':
				await this.ioc.TelegramApi.for(id).sendMessage({
					text: await this.ioc.Scheduler.getStat(id),
				});
				break;
			case 'imm':
				await this.ioc.Scheduler.doPost(this.findChannelByPoster(id));
				break;
			}
		}
	}

};