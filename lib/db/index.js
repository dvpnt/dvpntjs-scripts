#!/usr/bin/env node

const _ = require('underscore');
const path = require('path');
const os = require('os');
const {URL} = require('url');
const mongo = require('./mongo');
const postgres = require('./postgres');
const run = require('../run');
const errorHandler = require('../errorHandler');
const logger = require('../logger')('db');

const dbTypesHash = {mongo, postgres};

function parseUrl(dbUrl) {
	const url = new URL(dbUrl);

	return {
		..._(url).pick('hostname', 'port', 'password', 'username'),
		dbName: url.pathname.slice(1),
		type: _.initial(url.protocol).join('')
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

	const {type, ...dbParams} = parseUrl(dbUrl);

	await dbTypesHash[type].restore({...dbParams, dumpPath});

	if (isRemote) {
		logger.log(`remove ${dumpPath}`);
		await run('rm', ['-f', dumpPath]);
	}

	logger.log('successfully restored!');
}


async function drop(dbUrl) {
	const {type, ...dbParams} = parseUrl(dbUrl);

	await dbTypesHash[type].drop(dbParams);

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
