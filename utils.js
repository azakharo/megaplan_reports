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

function getTimePeriodStr(start, end) {
  const DATE_PRINT_FRMT = 'DD.MM.YYYY HH:mm:ss';
  return `${start.format(DATE_PRINT_FRMT)} - ${end.format(DATE_PRINT_FRMT)}`;
}

module.exports = {
  log,
  stringify,
  logData,
  getTimePeriodStr
};
