const Redis = require('ioredis');
const Component = require('./Component');

module.exports = class Storage extends Component {

	init() {
		this.redis = new Redis(this.config.redis);
	}

	async getUpdateId() {
		return this.redis.get('updateId');
	}

	async setUpdateId(val) {
		if ((await this.getUpdateId()) < val) {
			return this.redis.set('updateId', val);
		}
	}

};