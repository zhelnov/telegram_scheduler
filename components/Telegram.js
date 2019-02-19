const rp = require('request-promise-native');
const Component = require('./Component');

module.exports = class Telegram extends Component {

	init() {
		this.apiUrl = 'https://api.telegram.org';
		this.chatId = this.config.chatId;
		this.botToken = this.config.botToken;
		this.runPolling();
	}

	async runPolling() {
		let lastUpdateId = await this.ioc.Storage.getVar('lastUpdateId');
		const updates = await this.getUpdates(Number(lastUpdateId) + 1);
		const count = updates.length;

		if (count) {
			const [{ update_id: start }] = updates;
			lastUpdateId = updates[count - 1].update_id;
			await this.ioc.Storage.setVar('lastUpdateId', lastUpdateId);
			this.log('UPDATES', `${count} updates, update_id:[${start},${lastUpdateId}]`);
		}

		for (const update of updates) {
            const { update_id, message, callback_query } = update;

            if (callback_query) {
            	const {
            		from: { id: user_id, username },
            		message: { message_id },
            		data: reaction,
            	} = callback_query;

            	await this.ioc.Storage.setReaction({
            		update_id, message_id, reaction, username, user_id,
            	});

            	const { like, dislike } = await this.ioc.Storage.getReactions(message_id);
            	const { ok, description } = await this.updateReactions(message_id, like, dislike);

            	if (!ok) {
            		this.log('TELEGRAM ERROR', description);
            	}

            }
            if (!message) {
            	continue;
            }
            if (message.entities) {
            	this.handleCommand(message);
            }
            if (message && Array.isArray(message.photo)) {
            	const file = this.getLargestImgId(message.photo);
				const dbPayload = {
	                update_id,
	                update: JSON.stringify(update),
	                file_id: file,
	                poster: message.chat.username,
	                source: message.forward_from_chat && message.forward_from_chat.username,
	                date: message.date,
	            };
	            const saveResult = await this.ioc.Storage.saveUpdate(dbPayload);
	            
	            if (!saveResult) {
	                this.log('UPDATE SAVE ERROR', JSON.stringify(dbPayload));
	            }
            }
		}

		return this.runPolling();
	}

	async handleCommand({ from, text, entities }) {
		const commands = entities.filter(({ type }) => type === 'bot_command');

		for (const { offset, length } of commands) {
			const command = text.substr(offset + 1, length - 1);

			switch(command) {
			case 'stat':
				await this.sendMessage(await this.ioc.Scheduler.getStat(), from.id);
				break;
			case 'imm':
				await this.ioc.Scheduler.doPost();
				break;
			}
		}
	}

	getLargestImgId(ids) {
        return ids.reduce((acc, { file_id, file_size }) => {
            if (file_size > acc.max) {
                return { file: file_id, max: file_size };
            }
            return acc;
        }, { max: 0, file: null }).file;
    }

    getReactionLayout(likes, dislikes) {
    	return JSON.stringify({
			inline_keyboard: [[
				{
					text: `\uD83D\uDC4D лойс ${likes || ''}`,
					callback_data: 'like',
				},
				{
					text: `\uD83D\uDC4E атписка ${dislikes || ''}`,
					callback_data: 'dislike',
				}
			]]
		});
    }

	async apiRequest({ apiMethod, ...options }) {
		try {
			const response = await rp({
				url: `${this.apiUrl}/${this.botToken}/${apiMethod}`,
				method: 'POST',
				...options,
			});

			return JSON.parse(response);
		} catch (error) {
			this.log('TELEGRAM API ERROR', error);
			return {
				ok: false,
				description: error,
			};
		}
	}

	async updateReactions(message_id, likes, dislikes) {
		return this.apiRequest({
			apiMethod: 'editMessageReplyMarkup',
			formData: {
				chat_id: this.chatId,
				message_id,
				reply_markup: this.getReactionLayout(likes, dislikes),
			},
		});
	}

	async sendVideo(url) {
		return this.apiRequest({
			apiMethod: 'sendVideo',
			formData: {
				chat_id: this.chatId,
				video: url,
			},
		});
	}

	async sendPhoto(params) {
		return this.apiRequest({
			apiMethod: 'sendPhoto',
			formData: {
				chat_id: this.chatId,
				...params,
			},
		});
	}

	async sendMediaGroup(fileIds) {
		return this.apiRequest({
			apiMethod: 'sendMediaGroup',
			formData: {
				chat_id: this.chatId,
				media: JSON.stringify(fileIds.map(fileId => ({
					type: 'photo',
					media: fileId,
				}))),
			},
		});
	}

	async sendMessage(text, chat_id) {
		return this.apiRequest({
			apiMethod: 'sendMessage',
			formData: {
				chat_id: chat_id || this.chatId,
				text,
			},
		});
	}

	async getUpdates(offset) {
		return (await this.apiRequest({
			apiMethod: 'getUpdates',
			formData: {
				timeout: 1200, // 1 hour long polling
				offset,
			},
		})).result;
	}

	async getFile(file_id) {
		const { result } = await this.apiRequest({
			apiMethod: 'getFile',
			formData: {
				file_id,
			},
		});
		return `${this.apiUrl}/file/${this.botToken}/${result.file_path}`;
	}

};