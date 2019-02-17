const NodeSchedule = require('node-schedule');
const Component = require('./Component');

module.exports = class Scheduler extends Component {

	init() {
		this.singleJob = NodeSchedule.scheduleJob('30 7-23, * * *', this.doPost.bind(this));
		this.albumJob = NodeSchedule.scheduleJob('10 6 */1 * *', this.doAlbum.bind(this));
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
    	const postedIds = [];

		await this.ioc.Telegram.sendMediaGroup(photos.map(({ file_id }) => file_id));
		for (const { update_id } of photos) {
			await this.ioc.Storage.setPosted(update_id);
			postedIds.push(update_id);
		}
		this.log('POSTED', `album ${JSON.stringify(postedIds)}`);
		await this.lackUpdatesNotify();
    }

	async doPost() {
		const [msg] = await this.ioc.Storage.getNextPhotos();

		if (!msg) {
			return this.log('EMPTY', 'No photos to post!');
		}
		await this.ioc.Telegram.sendPhoto(msg.file_id);
		await this.ioc.Storage.setPosted(msg.update_id);
		this.log('POSTED', `update_id ${msg.update_id} file_id ${msg.file_id}`);
		await this.lackUpdatesNotify();
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

		this.log('NOTIFY', `${remains} updates remains`);

		return Promise.all(promises);
	}
	
};
