const rp = require('request-promise-native');
const Component = require('./Component');

module.exports = class Telegram extends Component {

	init() {
		this.apiUrl = 'https://api.telegram.org';
		this.chatId = this.config.chatId;
		this.botToken = this.config.botToken;
	}

	async apiRequest({ apiMethod, ...options }) {
		const response = await rp({
			url: `${this.apiUrl}/${this.botToken}/${apiMethod}`,
			method: 'POST',
			...options,
		});

		return JSON.parse(response);
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

	async sendPhoto(file_id) {
		return this.apiRequest({
			apiMethod: 'sendPhoto',
			formData: {
				chat_id: this.chatId,
				photo: file_id,
			},
		});
	}

	async sendMediaGroup(fileIds) {
		return this.apiRequest({
			apiMethod: 'sendMediaGroup',
			formData: {
				chat_id: this.chatId,
				media: fileIds.map(fileId => ({
					type: 'photo',
					media: fileId,
				})),
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