
'use strict';

module.exports = function(kbox) {

  // Node modules
  var path = require('path');

  // NPM modules
  var _ = require('lodash');
  var VError = require('verror');

  // Grab client module
  var Client = require('./lib/client.js');
  var pantheon = new Client(kbox);

  // Load our events and create modules
  require('./lib/create.js')(kbox, pantheon);
  require('./lib/events.js')(kbox, pantheon);

  /*
   * App package location.
   * NOTE: if in dev mode and not in a binary this should be internal. Internal
   * locations are relative to the node_modules folder
   * All
   * other modes should be an URL to an archive and then the path location of the app
   * relative to the archive root
   */
  var packageData = function() {

    // Get relevant config options
    var version = require(path.join(__dirname, 'package.json')).version;
    var locked = kbox.core.deps.get('globalConfig').locked;

    // Define our download versions
    var devUrl = 'http://apps.kalabox.io/kalabox-app-pantheon-latest.tar.gz';
    var prodUrl = [
      'https://github.com',
      'kalabox/kalabox-app-pantheon/releases/download',
      'v' + version,
      'kalabox-app-pantheon-' + version + '.tar.gz'
    ];

    // Return our pkg data
    return {
      url: (locked) ? prodUrl.join('/') : devUrl
    };

  };

  // Declare our app to the world
  kbox.create.add('pantheon', {
    task: {
      name: 'Pantheon',
      description: 'Creates a Pantheon app.',
      pkg: packageData()
    }
  });

  // Task to create kalabox apps
  kbox.tasks.add(function(task) {
    kbox.create.buildTask(task, 'pantheon');
  });

  // Create integration.
  kbox.integrations.create('pantheon', function(api) {

    // Authorize login.
    api.methods.auth = function(username, password) {
      pantheon.reset();
      return pantheon.auth(username, password)
      .wrap('Error authorizing: %s', username);
    };

    // Set the logins method of api.
    api.methods.logins = function() {
      return kbox.Promise.try(function() {
        pantheon.reset();
        return pantheon.getSessionFiles();
      })
      .wrap('Error getting logins.');
    };

    // Set the sites method of the api.
    api.methods.sites = function(username) {
      // Get email.
      // Set session based on email.
      return kbox.Promise.try(function() {
        pantheon.reset();
        var session = pantheon.getSessionFile(username);
        pantheon.setSession(username, session);
      })
      // Get and map sites.
      .then(function() {
        return pantheon.getSites()
        .then(function(sites) {
          return _.transform(sites, function(acc, val, key) {
            acc.push({
              name: val.information.name,
              id: key,
              // Instead of loading environments now, instead create a function
              // that can be called to get them when needed.
              getEnvironments: function() {
                // Reset cache.
                pantheon.reset();
                var session = pantheon.getSessionFile(username);
                pantheon.setSession(username, session);
                // Get environments.
                return pantheon.getEnvironments(key)
                // Wrap errors.
                .catch(function(err) {
                  throw new VError(err, 'Error getting environments.');
                })
                // Map, filter, and sort environments.
                .then(function(envs) {
                  delete envs.live;
                  delete envs.test;
                  envs = _.map(envs, function(val, key) {
                    return key;
                  });
                  envs.sort();
                  return envs;
                });
              }
            });
            return acc;
          }, []);
        });
      })
      .wrap('Error getting sites.');
    };

  });

};
