module.exports = class Component {
	
	constructor(container) {
		this.container = container;
	}

	log(type, message) {
        const now = new Date().toJSON();
        const msg =`${now} [${type.toUpperCase()}] ${message}`;
        this.container.logStream.write(`${msg}\n`);
	}

	get ioc() {
		return this.container.ioc;
	}

	get config() {
		return this.container.config;
	}

	getLargestImgId(ids) {
		return ids.reduce((acc, { file_id, file_size }) => {
			if (file_size > acc.max) {
				return { file: file_id, max: file_size };
			}
			return acc;
		}, { max: 0, file: null }).file;
	}

	getReactionLayout(likes, dislikes, channel) {
		const { like, dislike } = this.getChannelConfig(channel);

		if (!like) {
			return null;
		}
		return JSON.stringify({
			inline_keyboard: [[
				{
					text: `${like} ${likes || ''}`,
					callback_data: 'like',
				},
				{
					text: `${dislike} ${dislikes || ''}`,
					callback_data: 'dislike',
				}
			]]
		});
	}

	getChannelConfig(channel) {
		return this.config.channels.find(({ chatId }) => chatId === channel);
	}

	findChannelByPoster(user) {
		return this.config.channels.find(({ posters }) => posters.includes(user));
	}

};
