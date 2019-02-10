class App {

	constructor() {
		this.config = require('./config');
		this.ioc = [
			'Telegram',
			'Storage',
			'WebServer',
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
