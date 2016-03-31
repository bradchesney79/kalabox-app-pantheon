
'use strict';
module.exports = function(kbox, app) {

  // @todo: @remove
  app.events.on('post-app-start', function() {
    console.log('@@@@@ --> ' + app.name + ' <-- @@@@@');
  });

  // Node modules
  var _ = require('lodash');

  // Set our pantheon stuff into the env
  // @todo: multi-app
  var identifier = 'app_pantheon_config';
  app.env.setEnvFromObj(app.config.pluginconfig.pantheon, identifier);

  /*
   * Build the site after post-create happens
   */
  app.events.on('post-create-app', function(done) {

    // Get our push and pull stuff
    var puller = require('./pull.js')(kbox, app);

    // Our pantheon config for later on
    var pantheonConf = app.config.pluginconfig.pantheon;

    // Pull the pantheon site screenshot
    return puller.pullScreenshot(pantheonConf.site, pantheonConf.env)

    // Pull our code for the first time
    .then(function() {
      return puller.pullCode(pantheonConf.site, pantheonConf.env);
    })

    // Pull our DB
    .then(function() {
      return puller.pullDB(pantheonConf.site, pantheonConf.env);
    })

    // Get our files
    .then(function() {
      return puller.pullFiles(pantheonConf.site, pantheonConf.env);
    })

    .nodeify(done);

  });

  /*
   * We don't want to uninstall our data container on a rebuild
   * so remove the data container from here
   *
   * NOTE: this is a nifty implementation where we inception some events
   * to target exactly what we want
   */
  app.events.on('pre-app-rebuild', function() {

    // @todo: multi-app
    // @todo: need to figure out how to only have pre-engine-destroy run for
    // this app.

    // We want to edit our engine remove things
    events.on('pre-engine-destroy', function(data) {

      // Get our services
      var services = _.flatten(_.map(app.composeCore, function(file)  {
        return _.keys(kbox.util.yaml.toJson(file));
      }));

      // Remove the data element
      var withoutData = _.remove(services, function(service) {
        return service !== 'data';
      });

      // Update data to note remove data services on rebuilds
      data.opts = {services: withoutData};

    });

  });

};
