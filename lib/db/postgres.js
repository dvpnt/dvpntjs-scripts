#!/usr/bin/env node

const os = require('os');
const run = require('../run');

const cpusCount = os.cpus().length;

exports.drop = async ({dbName, hostname, password, port, username}) => {
	await run(
		'dropdb',
		[dbName],
		{
			env: {
				PGUSER: username,
				PGHOST: hostname,
				PGPORT: port,
				PGPASSWORD: password,
				...process.env
			}
		}
	);
};

exports.restore =
	async ({dbName, dumpPath, hostname, password, port, username}) => {
		await run(
			'createdb',
			[
				dbName,
				'--encoding', 'UTF8',
				'--template', 'template0',
				'--lc-collate', 'ru_RU.UTF-8',
				'--lc-ctype', 'ru_RU.UTF-8'
			],
			{
				env: {
					PGUSER: username,
					PGHOST: hostname,
					PGPORT: port,
					PGPASSWORD: password,
					...process.env
				}
			}
		);

		await run(
			'pg_restore',
			[
				'--host', hostname,
				'--port', port,
				'--dbname', dbName,
				'--username', username,
				'--jobs', cpusCount,
				'--exit-on-error',
				dumpPath
			],
			{env: {PGPASSWORD: password, ...process.env}}
		);
	};
