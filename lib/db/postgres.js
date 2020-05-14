const os = require('os');
const run = require('../run');

const cpusCount = os.cpus().length;

exports.drop = async ({db, hostname, password, port, username}) => {
	await run(
		'dropdb',
		[
			db,
			'--host', hostname,
			'--port', port,
			'--username', username
		],
		{env: {PGPASSWORD: password, ...process.env}}
	);
};

exports.restore =
	async ({db, dumpPath, hostname, password, port, username}) => {
		await run(
			'createdb',
			[
				db,
				'--host', hostname,
				'--port', port,
				'--username', username,
				'--encoding', 'UTF8',
				'--template', 'template0',
				'--lc-collate', 'ru_RU.UTF-8',
				'--lc-ctype', 'ru_RU.UTF-8'
			],
			{env: {PGPASSWORD: password, ...process.env}}
		);

		await run(
			'pg_restore',
			[
				'--host', hostname,
				'--port', port,
				'--dbname', db,
				'--username', username,
				'--jobs', cpusCount,
				'--exit-on-error',
				dumpPath
			],
			{env: {PGPASSWORD: password, ...process.env}}
		);
	};
