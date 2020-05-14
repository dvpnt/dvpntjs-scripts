const _ = require('underscore');
const path = require('path');
const os = require('os');
const {URL} = require('url');
const mongo = require('./mongo');
const postgres = require('./postgres');
const run = require('../run');
const errorHandler = require('../errorHandler');
const logger = require('../logger')('db');

const dbmsHash = {mongodb: mongo, postgresql: postgres};

function parseUrl(dbUrl) {
	const url = new URL(dbUrl);

	return {
		..._(url).pick('hostname', 'port', 'password', 'username'),
		db: url.pathname.slice(1),
		dbms: url.protocol.slice(0, -1)
	};
}

async function restore({dbUrl, source}) {
	const isRemote = /^https?:/.test(source);
	let dumpPath = source;

	logger.log(`restore ${dbUrl}`);

	if (isRemote) {
		dumpPath = path.join(os.tmpdir(), `db_${process.pid}.dump`);
		logger.log(`is remote, downloading to ${dumpPath}`);

		await run('curl', [source, '--output', dumpPath, '--silent']);
	}

	logger.log('run restore');

	const {dbms, ...dbParams} = parseUrl(dbUrl);
	await dbmsHash[dbms].restore({...dbParams, dumpPath});

	if (isRemote) {
		logger.log(`remove ${dumpPath}`);
		await run('rm', ['-f', dumpPath]);
	}

	logger.log('successfully restored!');
}


async function drop(dbUrl) {
	const {dbms, ...dbParams} = parseUrl(dbUrl);

	await dbmsHash[dbms].drop(dbParams);

	logger.log('successfully dropped!');
}

async function main(action, params) {
	try {
		await action(params);
	} catch (err) {
		errorHandler({err, logger});
	}
}

exports.drop = (dbUrl) => {
	main(drop, dbUrl);
};

exports.restore = ({dbUrl, source}) => {
	main(restore, {dbUrl, source});
};
