#!/usr/bin/env node
const fs = require('fs');

class App {

	constructor() {
		this.config = require('./config');
        this.logStream = fs.createWriteStream(this.config.logFile, { flags: 'a' });
 
		this.ioc = [
			'Storage',
			'Telegram',
			'Scheduler',
		].reduce((ioc, comp) => {
			const Class = require(`./components/${comp}`);
			ioc[comp] = new Class(this);
			return ioc;
		}, {});
		Object.entries(this.ioc).forEach(([name, component]) => component.init());
	}

}

new App();
