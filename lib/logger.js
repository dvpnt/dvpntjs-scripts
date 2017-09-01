const chalk = require('chalk');
const util = require('util');

function Logger(prefix) {
	this.prefix = prefix;
}

Logger.prototype.log = function() {
	process.stdout.write(
		chalk.green('[' + this.prefix + ']') + ' ' +
		util.format.apply(null, arguments) + '\n'
	);
};

Logger.prototype.error = function() {
	process.stderr.write(
		chalk.red('[' + this.prefix + ']') + ' ' +
		util.format.apply(null, arguments) + '\n'
	);
};

module.exports = function(prefix) {
	return new Logger(prefix);
};
