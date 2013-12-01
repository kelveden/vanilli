# vanilli

[![Build Status](https://travis-ci.org/kelveden/vanilli.png?branch=master)](https://travis-ci.org/kelveden/vanilli)
[![Dependencies Status](https://david-dm.org/kelveden/vanilli.png?branch=master)](https://david-dm.org/kelveden/vanilli)

> IMPORTANT: In it's *very* early stages. Expect the goalposts to move. A lot.

A RESTful server running on Nodejs for storing and matching stubs/expectations from a test run.

## Usage
Whilst vanilli exposes a RESTful API (which is documented below), it'll probably make more sense to talk to vanilli from its
javascript client library cousin https://github.com/kelveden/milli. You can also hook starting/shutting vanilli down into your grunt build
with https://github.com/kelveden/grunt-vanilli.

## REST API
TODO

## Installation

Installation is done via npm:

``` bash
$ npm install vanilli
```

Vanilli is designed to be kicked off as a step in your grunt build; so the typical usage will actually be via a plugin like
https://github.com/kelveden/grunt-vanilli.

However, if you do want to start it up manually you can find an example startup script in the bin folder of the source. I recommend
you pipe the sysout through bunyan to get your log output nicely formatted and colourised:

``` bash
$ bin/vanilli.sh | bunyan
```
