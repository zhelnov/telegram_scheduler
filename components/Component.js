module.exports = class Component {
	
	constructor(container) {
		this.container = container;
	}

	log(type, message) {
		console.log(`[${type}] ${message}`);
	}

	get ioc() {
		return this.container.ioc;
	}

	get config() {
		return this.container.config;
	}

};