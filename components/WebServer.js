const express = require('express');
const http = require('http');
const request = require('request');

const Component = require('./Component');

module.exports = class WebServer extends Component {

	init() {
		const { ip, port } = this.config;
		const app = express();

		app.get('/', (req, res) => res.send('ok'));
		app.get('/imm', this.postImmediate.bind(this));
		app.get('/stat', this.getStat.bind(this));
		app.get('/img/:id', this.getImage.bind(this));

		app.listen(port, ip, () => this.log('WEB', `${ip}:${port}`));

		this.app = app;
	}

	async getStat(req, res) {
		const upId = await this.ioc.Storage.getUpdateId();
		const { queue } = this.ioc.Scheduler;
		let html = `
			Now in queue: ${queue.length}<br>
			Update ID: ${upId}<br>
			<table>`;
		
		for (const { update_id, file, author, source, date } of queue) {
			html += `<tr>
			<td>${date}</td>
			<td>${author} from ${source}</td>
			<td><img src="/img/${file}" /></td>
			</tr>`;
		}
	    res.send(html + '</table>');
	}

	async getImage(req, res) {
		const path = await this.ioc.Telegram.getFile(req.params.id);
		request.get(path).pipe(res);
	}

	postImmediate(req, res) {
		this.ioc.Scheduler.postImmediate();
		res.send(`Posted immediately.`);
	}
}
