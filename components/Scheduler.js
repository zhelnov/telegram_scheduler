const NodeSchedule = require('node-schedule');
const Component = require('./Component');

module.exports = class Scheduler extends Component {

	init() {
		this.jobs = this.config.channels.reduce(
			(jobs, { chatId, singleSchedule, albumSchedule }) => {
				jobs[chatId] = {};
				if (singleSchedule) {
					jobs[chatId].singleJob = NodeSchedule.scheduleJob(
						singleSchedule, this.doPost.bind(this, chatId),
					);
				}
				if (albumSchedule) {
					jobs[chatId].albumJob = NodeSchedule.scheduleJob(
						albumSchedule, this.doAlbum.bind(this, chatId),
					);
				}
				return jobs;
			},
			{},
		);
	}

	async getStat(from) {
		const { chatId } = this.findChannelByPoster(from);
		const { singleJob, albumJob } = this.jobs[chatId];
		const out = [
			`Unposted photos: ${await this.ioc.Storage.getUnpostedCount(chatId)}`,
			singleJob && `Next single post: ${singleJob.nextInvocation().toString()}`,
			albumJob && `Next album post: ${albumJob.nextInvocation().toString()}`,
		];
		return out.filter(Boolean).join('\n');
	}

	async doAlbum(chat_id) {
		const photos = await this.ioc.Storage.getNextPhotos(chat_id, 5);
		const { ok, result, description } = await this.ioc.TelegramApi.for(chat_id).sendMediaGroup({
			media: JSON.stringify(photos.map(({ file_id }) => ({
				type: 'photo',
				media: file_id,
			}))),
		});

		if (ok) {
			for (const { update_id } of photos) {
				await this.ioc.Storage.setPosted(chat_id, update_id, result.message_id);
			}
			await this.lackUpdatesNotify(chat_id);
		} else {
			this.log('posting error', description);
		}
	}

	async doPost(chat_id) {
		const [msg] = await this.ioc.Storage.getNextPhotos(chat_id);

		if (!msg) {
			return this.log('empty', 'No photos to post!');
		}

		const sendPayload = {
			photo: msg.file_id,
			reply_markup: this.getReactionLayout(null, null, chat_id),
		};

		if (!sendPayload.reply_markup) {
			delete sendPayload.reply_markup;
		}

		const { ok, result, description } = await this.ioc.TelegramApi.for(chat_id).sendPhoto(sendPayload);

		if (ok) {
			await this.ioc.Storage.setPosted(chat_id, msg.update_id, result.message_id);
			await this.lackUpdatesNotify(chat_id);
		} else {
			this.log('posting error', `update_id ${msg.update_id} error ${description}`);
		}
	}

	async lackUpdatesNotify(chat_id) {
		const remains = await this.ioc.Storage.getUnpostedCount(chat_id);

		if (remains > this.config.notify.onCount) {
			return;
		}

		const { usersToNotify } = this.config.notify;
		const promises = usersToNotify.map(async user => {
			return this.ioc.TelegramApi.for(user).sendMessage({
				text: `There is only ${remains} updates in queue!`,
			});
		});

		this.log('notify', `${remains} updates remains`);

		return Promise.all(promises);
	}
	
};
