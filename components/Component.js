module.exports = class Component {
	
	constructor(container) {
		this.container = container;
	}

	log(type, message) {
        const now = new Date().toJSON();
        const msg =`${now} [${type}] ${message}`;
 
		console.log(msg);
        this.container.logStream.write(`${msg}\n`);
	}

	get ioc() {
		return this.container.ioc;
	}

	get config() {
		return this.container.config;
	}

};
