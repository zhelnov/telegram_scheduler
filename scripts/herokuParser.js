const fs = require('fs');
const StorageClass = require('../components/Storage');

(async () => {
	const Storage = new StorageClass({
		config: require('../config'),
	});
	const jsonToParse = require('./heroku.json');

	Storage.init();
	for (const [update_id, { file_id, poster, post_date }] of Object.entries(jsonToParse)) {
		const payload = {
			update_id, poster, file_id,
			date: post_date,
			update: '{}',
		};
		const { data, error } = await Storage.saveUpdate(payload);

		if (error) {
			console.error(error);
		} else {
			console.log(`${update_id} ok`);
		}
	}
})();

function parse(prefix, uid) {
	const imgs = document.getElementsByTagName('img');
	const parsed = Array.prototype.slice.call(imgs).reduce((a, im, i) => {
		const date = im.parentElement.parentElement.getElementsByTagName('td')[0].innerText;

		a[uid+i] = {
			file_id: im.src.replace(prefix, ''),
			poster: '',
			post_date: Date.parse(date)/1000,
		};

		return a;
	}, {});

	return JSON.stringify(parsed, null, '\t');
}