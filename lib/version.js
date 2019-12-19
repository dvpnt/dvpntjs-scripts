const _ = require('underscore');
const fs = require('fs');
const semver = require('semver');
const exec = require('./exec');
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

function saveVersion(packageJson, version) {
	packageJson.version = version;

	savePackageJson(packageJson);
}

function commitVersion(message) {
	exec('git add -A package.json');
	exec('git commit --no-verify -m \'' + message + '\'');
}

function prerelease(packageJson, version) {
	if (!packageJson.scripts.prerelease) {
		return;
	}

	exec(packageJson.scripts.prerelease, {
		env: {
			...process.env,
			VERSION: version
		}
	});
}

exports.bumpAlpha = function(params) {
	const packageJson = readPackageJson();
	const version = packageJson.version;
	const newVersion = semver.inc(version, 'prerelease', params.suffix);

	logger.log('bump alpha version');
	logger.log('current version: %s', version);
	logger.log('new version: %s', newVersion);

	saveVersion(packageJson, newVersion);
	commitVersion(newVersion);
};

exports.bumpRelease = function(params) {
	const packageJson = readPackageJson();
	const version = packageJson.version;
	const newVersion = semver.inc(version, params.bump);

	prerelease(packageJson, newVersion);

	logger.log('bump release version');
	logger.log('current version: %s', version);
	logger.log('bump %s', params.bump);
	logger.log('new version: %s', newVersion);

	saveVersion(packageJson, newVersion);
	commitVersion('release ' + newVersion);
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
