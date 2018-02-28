'use strict';

function log(msg) {
  console.log(msg);
}

function logData(data) {
  console.log(JSON.stringify(data, null, 2));
}

module.exports = {
  log,
  logData
};
