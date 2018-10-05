const _ = require('underscore');
const fs = require('fs');
const {execSync} = require('child_process');
const semver = require('semver');
const logger = require('./logger')('version');

function readPackageJson() {
	return JSON.parse(fs.readFileSync('./package.json', 'utf8'));
}

function savePackageJson(packageJson) {
	fs.writeFileSync(
		'./package.json',
		JSON.stringify(packageJson, null, 2) + '\n'
	);
}

function exec(cmd) {
	try {
		return execSync(cmd).toString().slice(0, -1);
	} catch (err) {
		logger.error('`%s` failed with code %d', cmd, err.status);
		process.exit(-1);
	}
}

exports.bumpAlpha = function(params) {
	const packageJson = readPackageJson();
	let version = packageJson.version;

	logger.log('bump alpha version');
	logger.log('current version: %s', version);
	version = semver.inc(version, 'prerelease', params.suffix);
	logger.log('new version: %s', version);
	packageJson.version = version;
	savePackageJson(packageJson);
	exec('git add -A package.json');
	exec('git commit --no-verify -m \'' + version + '\'');
};

exports.bumpRelease = function(params) {
	const packageJson = readPackageJson();
	let version = packageJson.version;

	logger.log('bump release version');
	logger.log('current version: %s', version);
	logger.log('bump %s', params.bump);
	version = semver.inc(version, params.bump);
	logger.log('new version: %s', version);
	packageJson.version = version;
	savePackageJson(packageJson);
	exec('git add -A package.json');
	exec('git commit --no-verify -m \'release ' + version + '\'');
};

exports.checkCwd = function() {
	const status = exec('git status --untracked-files=all --porcelain');

	if (status.length > 0) {
		logger.error('working directory is not clean:');
		_(status.split('\n')).each((item) => {
			logger.error(' ' + item);
		});
		process.exit(-1);
	}
};

exports.createTag = function() {
	const tag = 'v' + readPackageJson().version;
	logger.log('create tag %s', tag);
	exec('git tag \'' + tag + '\'');
};
