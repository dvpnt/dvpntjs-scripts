#!/usr/bin/env node

const _ = require('underscore');
const os = require('os');
const path = require('path');
const program = require('commander');
const {MongoClient} = require('mongodb');
const {Client} = require('pg');
const run = require('./run');
const isDebug = require('./isDebug');
const errorHandler = require('./errorHandler');
const logger = require('./logger')('db');

class Adapter {
	constructor(config = {}) {
		_(this).extend(config);

		this.cpusCount = os.cpus().length;
	}
}

class MongoAdapter extends Adapter {
	constructor(...args) {
		super(...args);

		this.name = 'mongo';
	}

	async drop() {
		const client = await MongoClient.connect(`mongodb://${this.hostname}:${this.port}`);

		await client.db(this.database).dropDatabase();
		return client.close();
	}

	restore({dumpPath}) {
		return run('mongorestore', [
			'--host', this.hostname,
			'--port', this.port,
			'--numParallelCollections', this.cpusCount,
			`--archive=${dumpPath}`,
			'--gzip',
			isDebug ? '' : '--quiet',
			'--stopOnError',
			'--nsFrom', `${this.database}.*`,
			'--nsTo', `${this.database}.*`
		]);
	}
}

class PgAdapter extends Adapter {
	constructor(...args) {
		super(...args);

		this.name = 'pg';
	}

	run(command, args, options) {
		return run(command, args, {
			...options,
			env: {PGPASSWORD: this.password, ...process.env}
		});
	}

	async query(sql) {
		const client = new Client({
			user: this.user,
			host: this.hostname,
			database: 'postgres',
			password: this.password,
			port: this.port
		});

		await client.connect();

		await client.query(sql);

		return client.end();
	}

	drop() {
		return this.query(`drop database if exists ${this.database};`);
	}

	async restore({dumpPath}) {
		await this.query(
			`create database ${this.database} owner ${this.user} ${this.createParams};`
		);

		await this.run('pg_restore', [
			'--host', this.hostname,
			'--port', this.port,
			'--dbname', this.database,
			'--username', this.user,
			'--jobs', this.cpusCount,
			'--exit-on-error',
			dumpPath
		]);
	}
}

async function drop({database}) {
	await database.drop();
	logger.log('successfully dropped!');
}

async function restore({database, source}) {
	const isRemote = /^https?:/.test(source);
	let dumpPath = source;

	logger.log(`restore ${database.name}://${database.hostname}:${database.port}/${database.database}`);

	if (isRemote) {
		dumpPath = path.join(os.tmpdir(), `db_${process.pid}.dump`);

		logger.log(`is remote, downloading to ${dumpPath}`);
		await run('curl', [
			source,
			'--output', dumpPath,
			'--silent'
		]);
	}

	logger.log('run drop');
	await database.drop();

	logger.log('run restore');
	await database.restore({dumpPath});

	if (isRemote) {
		logger.log(`remove ${dumpPath}`);
		await run('rm', ['-f', dumpPath]);
	}

	logger.log('successfully restored!');
}

async function main({action, ...params}) {
	try {
		await action(params);
	} catch (err) {
		errorHandler({err, logger});
	}
}

const exports = module.exports = (databases) => {
	program
		.command('drop')
		.description('drop database')
		.option('--db <database>', 'main, tickets, aisUpb, storefront or proflow')
		.action(({db}) => {
			main({action: drop, database: databases[db]});
		});

	program
		.command('restore')
		.description('restore database')
		.option('--db <database>', 'main, tickets, aisUpb, storefront or proflow')
		.option('--source <source>', 'local file or http link')
		.action(({db, source}) => {
			main({action: restore, database: databases[db], source});
		});

	program.parse(process.argv);

	if (!program.args.length) {
		program.help();
	}
};

exports.MongoAdapter = MongoAdapter;
exports.PgAdapter = PgAdapter;
