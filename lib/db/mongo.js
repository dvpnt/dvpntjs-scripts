const os = require('os');
const run = require('../run');
const isDebug = require('../isDebug');

const cpusCount = os.cpus().length;

exports.drop = async ({db, hostname, port}) => {
	await run(
		'mongo',
		[
			'--host', hostname,
			'--port', port,
			db,
			'--eval', 'db.dropDatabase()'
		]
	);
};

exports.restore = async ({db, dumpPath, hostname, port}) => {
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
			'--nsFrom', `${db}.*`,
			'--nsTo', `${db}.*`
		]
	);
};
