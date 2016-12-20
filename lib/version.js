'use strict';

var _ = require('underscore'),
	fs = require('fs'),
	path = require('path'),
	execSync = require('child_process').execSync,
	semver = require('semver'),
	logger = require('./logger')('version');

var readPackageJson = function() {
	return JSON.parse(fs.readFileSync('./package.json', 'utf8'));
};

var savePackageJson = function(packageJson) {
	fs.writeFileSync(
		'./package.json',
		JSON.stringify(packageJson, null, 2) + '\n'
	);
};

var exec = function(cmd) {
	try {
		return execSync(cmd).toString().slice(0, -1);
	} catch (err) {
		logger.error('`%s` failed with code %d', cmd, err.status);
		process.exit(-1);
	}
};

exports.bumpAlpha = function(params) {
	var packageJson = readPackageJson(),
		version = packageJson.version;

	logger.log('bump alpha version');
	logger.log('current version: %s', version);
	version = semver.inc(version, 'prerelease', params.suffix);
	logger.log('new version: %s', version);
	packageJson.version = version;
	savePackageJson(packageJson);
	exec('git add -A package.json');
	exec('git commit -m \'' + version + '\'');
};

exports.bumpRelease = function(params) {
	var packageJson = readPackageJson(),
		version = packageJson.version;

	logger.log('bump release version');
	logger.log('current version: %s', version);
	logger.log('bump %s', params.bump);
	version = semver.inc(version, params.bump);
	logger.log('new version: %s', version);
	packageJson.version = version;
	savePackageJson(packageJson);
	exec('git add -A package.json');
	exec('git commit -m \'release ' + version + '\'');
};

exports.checkCwd = function() {
	var status = exec('git status --untracked-files=all --porcelain');

	if (status.length > 0) {
		logger.error('working directory is not clean:');
		_(status.split('\n')).each(function(item) {
			logger.error(' ' + item);
		});
		process.exit(-1);
	}
};

exports.bumpStatic = function(params) {
	var versionPath = path.join(params.path, 'version.txt'),
		current;

	try {
		current = fs.readFileSync(versionPath).toString();
	} catch (err) {
		current = 'n/a';
	}

	logger.log('bump static version');
	logger.log('current version: %s', current);
	var version = exec('git rev-list --count HEAD');
	logger.log('new version: %d', version);
	fs.writeFileSync(versionPath, version);
	exec('git add -A ' + versionPath);
	exec('git commit -m \'static version bump\'');
};

exports.createTag = function() {
	var tag = 'v' + readPackageJson().version;
	logger.log('create tag %s', tag);
	exec('git tag \'' + tag + '\'');
};
