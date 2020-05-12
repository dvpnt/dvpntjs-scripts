#!/usr/bin/env node

const _ = require('underscore');
const os = require('os');
const path = require('path');
const {program} = require('commander');
const run = require('./run');
const isDebug = require('./isDebug');
const errorHandler = require('./errorHandler');
const logger = require('./logger')('db');

const cpusCount = os.cpus().length;

const dbTypesHash = {
	mongo: {
		drop: dropMongo,
		restore: restoreMongo
	},
	pg: {
		drop: dropPostgres,
		restore: restorePostgres
	}
};

function parseMongourl(url) {
	return url.match(/([\w.]+):(\d+)\/(\w+)/).slice(1);
}

function parsePostgresUrl(url) {
	return url.match(/(\w+):(\w+)@([\w.]+):(\d+)\/(\w+)/).slice(1);
}

async function restoreMongo({dbUrl, dumpPath}) {
	const [hostname, port, dbName] = parseMongourl(dbUrl);

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
}

async function restorePostgres({dbUrl, dumpPath}) {
	const [
		user,
		password,
		hostname,
		port,
		dbName
	] = parsePostgresUrl(dbUrl);

	await run(
		'createdb',
		[
			dbName,
			'--encoding', 'UTF8',
			'--template', 'template0',
			'--lc-collate', 'ru_RU.UTF-8',
			'--lc-ctype', 'ru_RU.UTF-8'
		],
		{env: {
			PGUSER: user,
			PGHOST: hostname,
			PGPORT: port,
			PGPASSWORD: password,
			...process.env
		}}
	);

	await run(
		'pg_restore',
		[
			'--host', hostname,
			'--port', port,
			'--dbname', dbName,
			'--username', user,
			'--jobs', cpusCount,
			'--exit-on-error',
			dumpPath
		],
		{env: {PGPASSWORD: password, ...process.env}}
	);
}

async function restore(dbRestore, {dbUrl, source}) {
	const isRemote = /^https?:/.test(source);
	let dumpPath = source;

	logger.log(`restore ${dbUrl}`);

	if (isRemote) {
		dumpPath = path.join(os.tmpdir(), `db_${process.pid}.dump`);

		logger.log(`is remote, downloading to ${dumpPath}`);

		await run(
			'curl',
			[
				source,
				'--output', dumpPath,
				'--silent'
			]
		);
	}

	logger.log('run restore');
	await dbRestore({dbUrl, dumpPath});

	if (isRemote) {
		logger.log(`remove ${dumpPath}`);
		await run('rm', ['-f', dumpPath]);
	}

	logger.log('successfully restored!');
}

async function dropMongo(dbUrl) {
	const [hostname, port, dbName] = parseMongourl(dbUrl);

	await run(
		'mongo',
		[
			'--host', hostname,
			'--port', port,
			dbName,
			'--eval', 'db.dropDatabase()'
		]
	);
}

async function dropPostgres(dbUrl) {
	const [
		user,
		password,
		hostname,
		port,
		dbName
	] = parsePostgresUrl(dbUrl);

	await run(
		'dropdb',
		[dbName],
		{env: {
			PGUSER: user,
			PGHOST: hostname,
			PGPORT: port,
			PGPASSWORD: password,
			...process.env
		}}
	);
}

async function drop(dbDrop, params) {
	await dbDrop(params);

	logger.log('successfully dropped!');
}

async function main(action, params) {
	try {
		await action(params);
	} catch (err) {
		errorHandler({err, logger});
	}
}

program
	.command('drop')
	.description('drop database')
	.option('--dbms <database>', 'mongo or pg')
	.option('--dburl <url>')
	.action(({dbms, dburl}) => {
		main(
			_(drop).partial(dbTypesHash[dbms].drop),
			dburl
		);
	});

program
	.command('restore')
	.description('restore database')
	.option('--dbms <database>', 'mongo or pg')
	.option('--dburl <url>')
	.option('--source <source>', 'local file or http link')
	.action(({dbms, dburl, source}) => {
		main(
			_(restore).partial(dbTypesHash[dbms].restore),
			{dbUrl: dburl, source}
		);
	});

program.parse(process.argv);

if (!program.args.length) {
	program.help();
}
