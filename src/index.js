'use strict';

const puppeteer = require('puppeteer');

/**
 * Log if DEBUG flag was passed
 * @param {Boolean} DEBUG
 * @param {string} msg
 */
const logger = (DEBUG, msg) =>
	DEBUG ? console.info(msg) : null;

/**
 * A default set of user agent patterns for bots/crawlers that do not perform
 * well with pages that require JavaScript.
 */
const botUserAgents = [
	'W3C_Validator',
	'baiduspider',
	'bingbot',
	'embedly',
	'facebookexternalhit',
	'linkedinbo',
	'outbrain',
	'pinterest',
	'quora link preview',
	'rogerbo',
	'showyoubot',
	'slackbot',
	'twitterbot',
	'vkShare',
	'Validator.nu/LV'
];

module.exports.botUserAgents = botUserAgents;

/* eslint-disable no-multi-spaces */

/**
 * A default set of file extensions for static assets that do not need to be
 * proxied.
 */
const staticFileExtensions = [
	'ai',
	'avi',
	'css',
	'dat',
	'dmg',
	'doc',
	'doc',
	'exe',
	'flv',
	'gif',
	'ico',
	'iso',
	'jpeg',
	'jpg',
	'js',
	'less',
	'm4a',
	'm4v',
	'mov',
	'mp3',
	'mp4',
	'mpeg',
	'mpg',
	'pdf',
	'png',
	'ppt',
	'psd',
	'rar',
	'rss',
	'svg',
	'swf',
	'tif',
	'torrent',
	'ttf',
	'txt',
	'wav',
	'wmv',
	'woff',
	'xls',
	'xml',
	'zip'
];

const pupperender = async (url, timeout) => {
	const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
	const page = await browser.newPage();
	await page.goto(url, {waitUntil: 'networkidle0'});
	await page.waitFor(timeout);
	const content = await page.content();
	await browser.close();
	return content;
};

const cache = {};

module.exports.makeMiddleware = options => {
	const DEBUG = options.debug;
	const timeout = options.timeout || 5000; // ms
	const useCache = Boolean(options.useCache);
	const cacheTTL = (options.cacheTTL || 3600) * 1000; // ms
	const userAgentPattern =
      options.userAgentPattern || new RegExp(botUserAgents.join('|'), 'i');
	const excludeUrlPattern = options.excludeUrlPattern ||
      new RegExp(`\\.(${staticFileExtensions.join('|')})$`, 'i');

	return function (req, res, next) {
		logger(DEBUG, `[pupperender middleware] USER AGENT: ${req.headers['user-agent']}`);
		if (!userAgentPattern.test(req.headers['user-agent']) ||
					excludeUrlPattern.test(req.path)) {
			return next();
		}

		const incomingUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
		logger(DEBUG, `[pupperender middleware] puppeterize url: ${incomingUrl}`);
		if (useCache && cache[incomingUrl] &&
					Date.now() <= cache[incomingUrl].expiresAt) {
			logger(DEBUG, `[pupperender middleware] Cache hit for ${incomingUrl}.`);
			res.set('Pupperender', 'true');
			res.set('Expires', new Date(cache[incomingUrl].expiresAt).toUTCString());
			res.send(cache[incomingUrl].data);
			return;
		}

		pupperender(incomingUrl, timeout)
			.then(content => { // eslint-disable-line promise/prefer-await-to-then
				cache[incomingUrl] = {
					expiresAt: Date.now() + cacheTTL,
					data: content
				};
				logger(DEBUG, `[pupperender middleware] Cache warmed for ${incomingUrl}.`);
				res.set('Pupperender', 'true');
				res.send(content);
			})
			.catch(error => {
				console.error(
					`[pupperender middleware] error fetching ${incomingUrl}`,
					error
				);
				return next();
			});
	};
};
