const rp = require('request-promise-native');
const Component = require('./Component');

module.exports = class TelegramApi extends Component {

	init() {
		this.apiUrl = 'https://api.telegram.org';
		this.botToken = this.config.botToken;
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
			this.log('telegram api error', error);
			return {
				ok: false,
				description: error,
			};
		}
	}

	for(chat_id) {
		return [
			'editMessageReplyMarkup',
			'sendVideo',
			'sendPhoto',
			'sendMediaGroup',
			'sendMessage',
		].reduce((acc, method) => {
			acc[method] = params => this.apiRequest({
				apiMethod: method,
				formData: {
					chat_id,
					...params,
				},
			});
			return acc;
		}, {});
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
