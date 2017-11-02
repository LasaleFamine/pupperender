'use strict';

const puppeteer = require('puppeteer');

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
	'ai',  'avi',  'css', 'dat',  'dmg', 'doc',     'doc',  'exe', 'flv',
	'gif', 'ico',  'iso', 'jpeg', 'jpg', 'js',      'less', 'm4a', 'm4v',
	'mov', 'mp3',  'mp4', 'mpeg', 'mpg', 'pdf',     'png',  'ppt', 'psd',
	'rar', 'rss',  'svg', 'swf',  'tif', 'torrent', 'ttf',  'txt', 'wav',
	'wmv', 'woff', 'xls', 'xml',  'zip'
];

const pupperender = async (url, timeout) => {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	await page.goto(url);
	await page.waitFor(timeout);
	const content = await page.content();
	await browser.close();
	return content;
};

module.exports.makeMiddleware = options => {
	const timeout = options.timeout || 11000; // ms

	const userAgentPattern =
      options.userAgentPattern || new RegExp(botUserAgents.join('|'), 'i');
	const excludeUrlPattern = options.excludeUrlPattern ||
      new RegExp(`\\.(${staticFileExtensions.join('|')})$`, 'i');

	return function (req, res, next) {
		console.info('[pupperender middleware] USER AGENT:', req.headers['user-agent']);
		if (!userAgentPattern.test(req.headers['user-agent']) ||
					excludeUrlPattern.test(req.path)) {
			return next();
		}

		const incomingUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
		console.info('[pupperender middleware] puppeterize url:', incomingUrl);
		pupperender(incomingUrl, timeout)
				.then(content => {
					res.set('Pupperender', 'true');
					res.send(content);
				})
				.catch(err => {
					console.error(
						`[pupperender middleware] error fetching ${incomingUrl}`,
						err
					);
					return next();
				});
	};
};
