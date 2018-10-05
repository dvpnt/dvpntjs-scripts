const chalk = require('chalk');
const util = require('util');
const isDebug = require('./isDebug');

class Logger {
	constructor(prefix) {
		this.prefix = prefix;
	}

	log() {
		process.stdout.write(
			chalk.green('[' + this.prefix + ']') + ' ' +
			util.format.apply(null, arguments) + '\n'
		);
	}

	error() {
		process.stderr.write(
			chalk.red('[' + this.prefix + ']') + ' ' +
			util.format.apply(null, arguments) + '\n'
		);
	}

	debug() {}
}

class DebugLogger extends Logger {
	debug() {
		process.stderr.write(
			chalk.blue('[' + this.prefix + ']') + ' ' +
			util.format.apply(null, arguments) + '\n'
		);
	}
}

module.exports = function(prefix) {
	return isDebug ? new DebugLogger(prefix) : new Logger(prefix);
};
