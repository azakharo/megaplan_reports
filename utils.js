'use strict';

function log(msg) {
  console.log(msg);
}

function logData(data) {
  console.log(stringify(data));
}

function stringify(data) {
  return JSON.stringify(data, null, 2);
}

module.exports = {
  log,
  stringify,
  logData
};
