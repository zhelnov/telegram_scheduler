const NodeSchedule = require('node-schedule');
const Component = require('./Component');

module.exports = class Scheduler extends Component {

	init() {
		this.jobs = this.config.channels.reduce(
			(jobs, { singleSchedule, albumSchedule, ...channelConf }) => {
				jobs[chatId] = {};
				if (singleSchedule) {
					jobs[chatId].singleJob = NodeSchedule.scheduleJob(
						singleSchedule, this.doPost.bind(this, channelConf),
					);
				}
				if (albumSchedule) {
					jobs[chatId].albumJob = NodeSchedule.scheduleJob(
						albumSchedule, this.doAlbum.bind(this, channelConf),
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

	async doAlbum({ chat_id, notifyOnRemains, poster }) {
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
			if (notifyOnRemains) {
				await this.lackUpdatesNotify(chat_id, notifyOnRemains, poster);
			}
		} else {
			this.log('posting error', description);
		}
	}

	async doPost({ chat_id, notifyOnRemains, poster }) {
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
			if (notifyOnRemains) {
				await this.lackUpdatesNotify(chat_id, notifyOnRemains, poster);
			}
		} else {
			this.log('posting error', `update_id ${msg.update_id} error ${description}`);
		}
	}

	async lackUpdatesNotify(chat_id, notifyOnRemains, userToNotify) {
		const remains = await this.ioc.Storage.getUnpostedCount(chat_id);

		if (remains > notifyOnRemains) {
			return;
		}
		this.log('notify', `${remains} updates remains`);

		return this.ioc.TelegramApi.for(userToNotify).sendMessage({
			text: `There is only ${remains} updates in queue!`,
		});
	}
	
};
