const express = require('express');
const http = require('http');
const request = require('request');

const Component = require('./Component');

module.exports = class WebServer extends Component {

	init() {
		const { ip, port } = this.config;
		const app = express();

		app.get('/', (req, res) => res.send('ok'));
		app.get('/img/:id', this.getImage.bind(this));

		app.listen(port, ip, () => this.log('WEB', `${ip}:${port}`));

		this.app = app;
	}

	async getImage(req, res) {
		const path = await this.ioc.Telegram.getFile(req.params.id);
		request.get(path).pipe(res);
	}

}
