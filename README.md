# pupperender
[![Build Status](https://travis-ci.org/LasaleFamine/pupperender.svg?branch=master)](https://travis-ci.org/LasaleFamine/pupperender) [![Build status](https://ci.appveyor.com/api/projects/status/7adc8sxp20kgw10v?svg=true)](https://ci.appveyor.com/project/LasaleFamine/pupperender) [![codecov](https://codecov.io/gh/LasaleFamine/pupperender/badge.svg?branch=master)](https://codecov.io/gh/LasaleFamine/pupperender?branch=master)

> ExpressJs middleware for rendering PWA to bots using Puppeteer

This is a middleware for ExpressJs that uses Puppeter for render the page requested by "indexing" bots (and not).

This is a fork of the [rendertron-middleware](https://www.npmjs.com/package/rendertron-middleware) but using [Puppeter](https://github.com/GoogleChrome/puppeteer) instead of [Rendertron](https://github.com/GoogleChrome/rendertron/), without needing another server to render the app. I have made some changes for my personal use (like removing the inject ShadyDOM option).

## Install

> NOTE: *Node >= 8.x is required.*

```
$ yarn add pupperender
```

## Usage

```js
const express = require('express');
const pupperender = require('pupperender');

const app = express();

app.use(pupperender.makeMiddleware({}));

app.use(express.static('files'));
app.listen(8080);
```

## Configuration

Like [rendertron-middleware](https://www.npmjs.com/package/rendertron-middleware) I decided to expose a  `makeMiddleware` function that takes a configuration object with the following
properties:

| Property | Default | Description |
| -------- | ------- | ----------- |
| `userAgentPattern` | A set of known bots that benefit from pre-rendering. [Full list.](https://github.com/LasaleFamine/pupperender/blob/master/src/index.js) | RegExp for matching requests by User-Agent header. |
| `excludeUrlPattern` | A set of known static file extensions. [Full list.](https://github.com/LasaleFamine/pupperender/blob/master/src/index.js) | RegExp for excluding requests by the path component of the URL. |
| `timeout` | `11000` | Millisecond timeout for waiting the page to load. Used by Puppeter. See also the [Puppeter waitFor()](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagewaitforselectororfunctionortimeout-options-args) |


## License

MIT © [LasaleFamine](https://godev.space)
