class RunError extends Error {
	constructor(command, code) {
		super(`${command} non zero exit code ${code}`);

		this.stack = null;
	}
}

exports.RunError = RunError;
