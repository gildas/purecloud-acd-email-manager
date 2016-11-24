'use strict';
const debug  = require('debug')('config');
const config = require('nconf');

/**
* Retrieve the configuration
*   Order: CLI, Environment, config file, defaults.
*   Reminder: When running through foreman (nf), the port will be set to 5000 via the environment
*/
config.argv({
  port: { alias: 'p', describe: 'Make the server listen to this port' },
})
.env({ separator: '_', lowerCase: true })
.file({ file: './config.json' })
.defaults({
  port:    3000,
  workers: 'auto',
  purecloud: {
    region:       'mypurecloud.com',
    organization: { id: undefined },
    timeout:      5000,
    client: {
      id:     undefined,
      secret: undefined,
    },
  },
});

process.on('SIGHUP', function() {
  debug("Reloading configuration on SIGHUP...");
  try {
    config.reload();
    console.log("Configuration Reloaded (SIGHUP)");
    debug("Configuration reloaded successfully");
  } catch (err) {
    console.warn('Failed to reload the configuration: %s', err);
    debug('Failed to reload the configuration: %m', err);
  }
});

exports = module.exports = config;
