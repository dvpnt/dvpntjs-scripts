const {execSync} = require('child_process');
const logger = require('./logger')('exec');

module.exports = (cmd, options) => {
	try {
		return execSync(cmd, options).toString().slice(0, -1);
	} catch (err) {
		logger.error('`%s` failed with code %d', cmd, err.status);
		process.exit(-1);
	}
};
