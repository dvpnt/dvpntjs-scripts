#!/usr/bin/env node

const os = require('os');
const run = require('../run');
const isDebug = require('../isDebug');

const cpusCount = os.cpus().length;

exports.drop = async ({dbName, hostname, port}) => {
	await run(
		'mongo',
		[
			'--host', hostname,
			'--port', port,
			dbName,
			'--eval', 'db.dropDatabase()'
		]
	);
};

exports.restore = async ({dbName, dumpPath, hostname, port}) => {
	await run(
		'mongorestore',
		[
			'--host', hostname,
			'--port', port,
			'--numParallelCollections', cpusCount,
			`--archive=${dumpPath}`,
			'--gzip',
			isDebug ? '' : '--quiet',
			'--stopOnError',
			'--nsFrom', `${dbName}.*`,
			'--nsTo', `${dbName}.*`
		]
	);
};
