const Component = require('./Component');

module.exports = class Scheduler extends Component {

	init() {
		this.activeTimeout = null;
		this.queue = [];
		this.ioc.Storage.setUpdateId(this.config.lastUpdate);
		//this.doPost();
	}

	async parseUpdates() {
		const upId = await this.ioc.Storage.getUpdateId();
		const result = await this.ioc.Telegram.getUpdates(upId);
		const queue = [];

		for (const { update_id, message } of result) {
			if (message && Array.isArray(message.photo)) {
				const { file } = message.photo.reduce((acc, { file_id, file_size }) => {
					if (file_size > acc.max) {
						return { file: file_id, max: file_size };
					}
					return acc;
				}, { max: 0, file: null });

				queue.push({
					update_id,
					file,
					author: message.chat.username,
					source: message.forward_from_chat && message.forward_from_chat.username,
					date: new Date(message.forward_date * 1000).toLocaleString(),
				});
			}
		}
		if (queue.length) {
			this.log('UPDATES', `${queue.length} messages from update_id ${update_id}`);
		}
		if (queue.length < this.config.notify.onCount) {
			await this.lackUpdatesNotify(queue.length);
		}

		return queue;
	}

	postImmediate() {
		clearTimeout(this.activeTimeout);
		this.doPost(2);
	}

	getNextTimeout() {
		return parseInt(Math.random()*300000) + 3600000;
	}

	doPost(timeout) {
		const t = timeout || this.getNextTimeout();

		this.activeTimeout = setTimeout(async () => {
			const msg = this.queue.shift();

			if (msg) {
				await this.ioc.Telegram.sendPhoto(msg.file);
				this.log('POSTED', `update_id ${msg.update_id} file_id ${msg.file}`);
				await this.ioc.Storage.setUpdateId(msg.update_id + 1);
			} else {
				clearTimeout(this.activeTimeout);
				this.queue = await this.parseUpdates();
			}
			this.doPost();
		}, t);
		this.log('NEXT', `${parseInt(t/60000)} minutes`);
	}

	async lackUpdatesNotify(remains) {
		const { usersToNotify } = this.config.notify;
		const promises = usersToNotify.map(async user => this.ioc.Telegram.sendMessage(
			`There is only ${remains} updates in queue!`,
			user,
		));

		this.log('NOTIFY', `${remains} updates remains`);

		return Promise.all(promises);
	}
	
};