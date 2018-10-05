const {spawn} = require('child_process');
const {RunError} = require('./errors');
const isDebug = require('./isDebug');
const logger = require('./logger')('run');

module.exports = (command, args = [], options = {}) =>
	new Promise((resolve, reject) => {
		logger.debug(`run "${command} ${args.join(' ')}"`);

		const child = spawn(command, args, {
			stdio: ['inherit', isDebug ? 'inherit' : 'ignore', 'inherit'],
			...options
		});

		child.on('exit', (code) => {
			if (code) {
				reject(new RunError(command, code));
			} else {
				resolve();
			}
		});

		child.on('error', reject);
	});
