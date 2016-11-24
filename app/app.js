#!/usr/bin/env node
'use strict';
const app_info   = require('../package.json');
const debug      = require('debug')('Application');
const logger     = require('morgan');
const config     = require('./config.js');
const cluster    = require('cluster');

if (cluster.isMaster) {
  var cpu_count    = require('os').cpus().length;
  // Count the machine's CPUs
  var worker_count = config.get('workers');

  console.log('Running on the cluster master process');

  if (worker_count === 'auto') {
    worker_count = cpu_count / 2;
  } else {
    worker_count = parseInt(worker_count, 10);
    if (worker_count <= 0) { worker_count = 1; }
  }

  console.log('This machine has %d CPUs, spawning %d workers', cpu_count, worker_count);
  for (var i=1; i <= worker_count; i += 1) {
    console.log('Starting worker #%d/%d', i, worker_count);
    cluster.fork();
  }
  if (process.env.NODE_ENV !== 'development') {
    cluster.on('exit', worker => {
      console.log('worker %d died, spawning a new worker...', worker.id);
      cluster.fork();
    });
  }
} else {
  console.log('Running on cluster worker process #%d', cluster.worker.id);
  const fs         = require('fs');
  const path       = require('path');
  const http       = require('http');
  const express    = require('express');
  const bodyParser = require('body-parser');
  const engine     = require('ejs-locals');
  const favicon    = require('serve-favicon');

  /**
  * Create the application.
  */
  var app = express();

  /**
  * Environment and git information
  */
  console.log("Version: %s (%s)", app_info.version, app.get('env'));

  /**
  * Configure the application.
  */
  app.set('port', config.get('port'));
  app.set('views', 'views');
  app.set('view engine', 'ejs');
  app.engine('ejs', engine);
  app.use(logger(app.get('env') === 'development' ? 'dev' : 'combined'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));

  app.use(favicon('public/favicon.ico'));
  app.use(express.static('public'));
  app.use('/bower_components', express.static('bower_components'));

  /**
  * Configure the routes.
  */

  // Common tracing and locals
  app.use(function(req, res, next) {
    debug("Worker %d - %s %s", cluster.worker.id, req.method, req.path);
    req.purecloud = {
      environment:    config.get('purecloud:region'),
      organizationId: config.get('purecloud:organization:id'), 
      strategy:       'client-credentials',
      clientId:       config.get('purecloud:client:id'),
      clientSecret:   config.get('purecloud:client:secret'),
      timeout:        5,
    };
    res.locals.app_version = app_info.version;
    next();
  });

  // Application routes
  app.use('/',       require('../routes/index'));

  // Error routes
  app.use(function(req, res, next) { // catch 404 and forward to error handler
    var err = new Error('Not Found');
    err.status = 404;
    console.warn('Error: %o', err);
    next(err);
  });

  if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) { // development error handler (with stacktrace)
      res.status(err.status || 500);
      console.warn('Error: %o', err);
      res.render('error', { message: err.message, error: err });
    });
  } else {
    app.use(function(err, req, res, next) { // production error handler (without stacktraces)
      res.status(err.status || 500);
      console.warn('Error: %o', err);
      res.render('error', { message: err.message, error: {} });
    });
  }

  /**
   * Create Application servers.
   */
  app.listen(config.get('port'), function(){
    console.log("Web Server Listening on port %s", config.get('port'));
  });
}

// Expose app
exports = module.exports = app;
