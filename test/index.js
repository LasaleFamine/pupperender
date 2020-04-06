'use strict';

const express = require('express');
const supertest = require('supertest');
const test = require('ava');

const pupperender = require('./../src');

/**
 * Start the given Express app on localhost with a random port.
 * @param {!Object} app The app.
 * @return {Promise<string>}Promise of the URL.
 */
async function listen(app) {
	return new Promise(resolve => {
		const server = app.listen(/* random */ 0, 'localhost', () => {
			resolve(`http://localhost:${server.address().port}`);
		});
	});
}

/**
 * Make an Express app that uses the pupperender middleware and returns
 * "fallthrough" if the middleware skipped the request (i.e. called `next`).
 * @param {Object} options pupperender middleware options.
 * @return {!Object} The app.
 */
function makeApp(options) {
	return express()
		.use(pupperender.makeMiddleware(options))
		.use((request, response) => response.end('fallthrough'));
}

/**
 * Make an Express app that always return 500
 * @param {Object} options pupperender middleware options.
 * @return {!Object} The app.
 */
function makeAppError(options) {
	return express()
		.use('/error', (request, response) => response.status(500).end('proxy error'))
		.use(pupperender.makeMiddleware(options))
		.use((request, response) => response.end('fallthrough'));
}

const bot = 'slackbot';
const human = 'Chrome';

/**
 * GET a URL with the given user agent.
 * @param {string} userAgent The user agent string.
 * @param {string} host The host part of the URL.
 * @param {string} path The path part of the URL.
 * @return {Promise<!Object>} Promise of the GET response.
 */
function get(userAgent, host, path) {
	return supertest(host).get(path).set('User-Agent', userAgent);
}

test('makes a middleware function', t => {
	const m = pupperender.makeMiddleware({});
	t.truthy(m);
});

test('throws if no object conf given', t => {
	t.throws(() => pupperender.makeMiddleware());
});

test('puppeterize getting a route as bot', async t => {
	const appUrl = await listen(makeApp({}));

	const response = await get(bot, appUrl, '/foo');
	t.is(response.status, 200);
	t.true(Boolean(response.get('Pupperender')));
});

test('puppeterize is being cached if configured', async t => {
	const appUrl = await listen(makeApp({useCache: true}));

	const response = await get(bot, appUrl, '/foo');
	t.is(response.status, 200);
	t.false(Boolean(response.get('Expires')));
	const cachedResponse = await get(bot, appUrl, '/foo');
	t.is(cachedResponse.status, 200);
	t.true(Boolean(cachedResponse.get('Expires')));
});

test('cache respects cache timeout', async t => {
	const appUrl = await listen(makeApp({useCache: true, cacheTTL: 1}));

	const response = await get(bot, appUrl, '/foo');
	t.is(response.status, 200);
	t.false(Boolean(response.get('Expires')));
	await new Promise(resolve => setTimeout(resolve, 2000));
	const cachedResponse = await get(bot, appUrl, '/foo');
	t.is(cachedResponse.status, 200);
	t.false(Boolean(cachedResponse.get('Expires')));
});

test('excludes static file paths by default', async t => {
	const appUrl = await listen(makeApp({}));

	const response = await get(bot, appUrl, '/foo.png');
	t.is(response.text, 'fallthrough');
});

test('url exclusion only matches url path component', async t => {
	const appUrl = await listen(makeApp({}));

	const response = await get(bot, appUrl, '/foo.png?params');
	t.is(response.text, 'fallthrough');
});

test('excludes non-bot user agents by default', async t => {
	const appUrl = await listen(makeApp({}));

	const response = await get(human, appUrl, '/foo');
	t.is(response.text, 'fallthrough');
});

test('respects custom user agent pattern', async t => {
	const appUrl = await listen(makeApp({userAgentPattern: /borg/}));

	const response1 = await get('humon', appUrl, '/foo');
	t.is(response1.text, 'fallthrough');

	const response2 = await get('borg', appUrl, '/foo');
	t.true(Boolean(response2.get('Pupperender')));
});

test('respects custom exclude url pattern', async t => {
	const appUrl = await listen(makeApp({excludeUrlPattern: /foo/}));

	const response1 = await get(bot, appUrl, '/foo');
	t.is(response1.text, 'fallthrough');

	const response2 = await get(bot, appUrl, '/bar');
	t.true(Boolean(response2.get('Pupperender')));
});

test('forwards page error status and body', async t => {
	// This proxy always returns an error.
	const appUrl = await listen(makeAppError({}));

	const response = await get(bot, appUrl, '/error');
	t.is(response.status, 500);
	t.is(response.text, 'proxy error');
});
