var NativeInterface = require('./lib/interfaceNative');
var EmulatedInterface = require('./lib/interfaceEmulated');
var QueuedInterface = require('./lib/interfaceQueued');

var randomId = require('./lib/util/helper').randomId;

var nativeCommands = ['info', 'geoadd', 'geohash', 'geopos', 'geodist', 'georadius', 'georadiusbymember'];

const makePromise = (fn, args = []) =>
  new Promise((resolve, reject) => {
    fn(
      ...[
        ...args,
        (err, result) => {
          if (err) {
            reject(err)
            return
          }
          resolve(result)
        },
      ]
    )
  })

// main constructor

function GeoSet(options) {
  options = options || {};
  this.zset = options.zset || 'geo:locations';
  this.parentGeoSet = options.parentGeoSet || null;
}


GeoSet.prototype.getClientInterface = function() {
  return this.parentGeoSet ? this.parentGeoSet.clientInterface : this.clientInterface;
};


// initialization

GeoSet.prototype.initialize = function(client, options) {
  options = options || {};
  this.zset = options.zset ? options.zset : 'geo:locations';
  setInterface(this, client, options.nativeGeo);

  return this;
};


// managing sets

GeoSet.prototype.addSet = function(setName) {
  return new GeoSet({
    zset: this.zset + ':' + (setName || 'subset_' + randomId()),
    parentGeoSet: this.parentGeoSet || this
  });
};

GeoSet.prototype.deleteSet = function(setName, callBack) {
  this.getClientInterface().del(this.zset + ':' + setName, callBack);
};

GeoSet.prototype.delete = function(callBack) {
  this.getClientInterface().del(this.zset, callBack);
};


// adding locations

GeoSet.prototype.addLocation = function(locationName, point) {
  const geoAdd = this.getClientInterface().geoAdd.bind(this.getClientInterface())
  return makePromise(geoAdd, [locationName, point, this.zset]);
};

GeoSet.prototype.addLocations = function(locationSet) {
  const geoAddMulti = this.getClientInterface().geoAddMulti.bind(this.getClientInterface())
  return makePromise(geoAddMulti, [locationSet, this.zset]);
};


// Calculations

GeoSet.prototype.distance = function(locationNameA, locationNameB, options, callBack) {
  if (typeof options === 'function') {
    callBack = options;
    options = {};
  } else {
    options = options || {};
  }

  this.getClientInterface().geodist(locationNameA, locationNameB, options.units, this.zset, callBack);
};


// updating locations (same methods as add, existing locations get updated)

GeoSet.prototype.updateLocation = GeoSet.prototype.addLocation;

GeoSet.prototype.updateLocations = GeoSet.prototype.addLocations;


// removing locations

GeoSet.prototype.removeLocation = function(locationName, callBack) {
  this.getClientInterface().zrem([locationName], this.zset, callBack);
};

GeoSet.prototype.removeLocations = function(locationNameArray, callBack) {
  this.getClientInterface().zrem(locationNameArray, this.zset, callBack);
};


// querying location positions

GeoSet.prototype.location = function(locationName) {
  const geoPos = this.getClientInterface().geoPos.bind(this.getClientInterface())
  return makePromise(geoPos, [[locationName], this.zset]);
};

GeoSet.prototype.locations = function(locationNameArray) {
  const geoPosMulti = this.getClientInterface().geoPosMulti.bind(this.getClientInterface())
  return makePromise(geoPosMulti, [locationNameArray, this.zset]);
};


// querying location geohashes

GeoSet.prototype.getGeohash = function(locationName, callBack) {
  this.getClientInterface().geohash([locationName], this.zset, callBack);
};

GeoSet.prototype.getGeohashes = function(locationNameArray, callBack) {
  this.getClientInterface().geohashes(locationNameArray, this.zset, callBack);
};


// querying nearby locations

GeoSet.prototype.radius = function(location, radius, options, callBack) {
  if (typeof options === 'function') {
    callBack = options;
    options = {};
  } else {
    options = options || {};
  }

  if (typeof location === 'string') {
    this.getClientInterface().georadiusbymember(location, radius, options, this.zset, callBack);
  } else {
    this.getClientInterface().georadius(location, radius, options, this.zset, callBack);
  }
};

GeoSet.prototype.nearby = function(location, distance, options) {
  if (typeof options === 'function') {
    callBack = options;
    options = {};
  } else {
    options = options || {};
  }

  if (typeof location === 'string') {
    const nearbyMember = this.getClientInterface().nearbyMember.bind(this.getClientInterface())
    return makePromise(nearbyMember, [location, distance, options, this.zset]);
  } else {
    const nearby = this.getClientInterface().nearby.bind(this.getClientInterface())
    return makePromise(nearby, [location, distance, options, this.zset]);
  }
};


// interface config

function setInterface(geoSet, client, nativeGeo) {
  var queuedInterface = new QueuedInterface(client);

  if (nativeGeo === true) {
    geoSet.clientInterface = new NativeInterface(client);
    return;
  } else if (nativeGeo === false) {
    geoSet.clientInterface = new EmulatedInterface(client);
    return;
  }

  geoSet.clientInterface = queuedInterface;
  checkNativeInterface(queuedInterface, geoSet, client);
}

function checkNativeInterface(queuedInterface, geoSet, client) {
  try {
    client.send_command('command', nativeCommands, function(err, response) {
      if (!err && hasNativeCommands(response)) {
        geoSet.clientInterface = queuedInterface.drain(new NativeInterface(client));
      } else {
        geoSet.clientInterface = queuedInterface.drain(new EmulatedInterface(client));
      }
    });
  } catch (err) {
    geoSet.clientInterface = queuedInterface.drain(new EmulatedInterface(client));
  }
}

function hasNativeCommands(response) {
  if (Array.isArray(response) && response.length === nativeCommands.length - 1) {
    for (var i = 0; i < response.length; i++) {
      if (!response[i]) {
        return false;
      }
    }
    return true;
  }

  return false;
}


module.exports = exports = new GeoSet();
