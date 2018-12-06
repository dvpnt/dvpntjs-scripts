const {RunError} = require('./errors');
const defaultLogger = require('./logger')('error');

module.exports = ({err, logger = defaultLogger, code = 1}) => {
	if (!err) {
		return process.exit(0);
	}

	logger.error(err instanceof RunError ? err.message : err.stack || err);

	process.exit(code);
};
