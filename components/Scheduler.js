const NodeSchedule = require('node-schedule');
const Component = require('./Component');

module.exports = class Scheduler extends Component {

	init() {
		this.singleJob = NodeSchedule.scheduleJob('25 9-23, * * *', this.doPost.bind(this));
		this.albumJob = NodeSchedule.scheduleJob('5 8,12,16,20 */1 * *', this.doAlbum.bind(this));
	}

	async getStat() {
		return `
			Unposted photos: ${await this.ioc.Storage.getUnpostedCount()}\n
			Next single post: ${this.singleJob.nextInvocation().toString()}\n
			Next album post: ${this.albumJob.nextInvocation().toString()}\n
		`;
	}

    async doAlbum() {
    	const photos = await this.ioc.Storage.getNextPhotos(5);
		const { ok, result, description } = await this.ioc.Telegram.sendMediaGroup(
			photos.map(({ file_id }) => file_id),
		);

		if (ok) {
			for (const { update_id } of photos) {
				await this.ioc.Storage.setPosted(update_id, result.message_id);
			}
			await this.lackUpdatesNotify();
		} else {
			this.log('posting error', description);
		}
    }

	async doPost() {
		const [msg] = await this.ioc.Storage.getNextPhotos();

		if (!msg) {
			return this.log('empty', 'No photos to post!');
		}

		const { ok, result, description } = await this.ioc.Telegram.sendPhoto({
			photo: msg.file_id,
			reply_markup: this.ioc.Telegram.getReactionLayout(),
		});

		if (ok) {
			await this.ioc.Storage.setPosted(msg.update_id, result.message_id);
			await this.lackUpdatesNotify();
		} else {
			this.log('posting error', `update_id ${msg.update_id} error ${description}`);
		}
	}

	async lackUpdatesNotify() {
		const remains = await this.ioc.Storage.getUnpostedCount();

		if (remains > this.config.notify.onCount) {
			return;
		}

		const { usersToNotify } = this.config.notify;
		const promises = usersToNotify.map(async user => this.ioc.Telegram.sendMessage(
			`There is only ${remains} updates in queue!`,
			user,
		));

		this.log('notify', `${remains} updates remains`);

		return Promise.all(promises);
	}
	
};
