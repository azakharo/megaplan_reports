'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const {log, stringify} = require('./utils');

const CONFIG_NAME = 'megaplan.config';
const configPath = path.join(os.homedir(), CONFIG_NAME);
const CONFIG_ENCODING = 'utf8';

function loadConfig() {
  log(`load config from '${configPath}'`);
  let config = {};
  try {
    const fileCont = fs.readFileSync(configPath, CONFIG_ENCODING);
    config = JSON.parse(fileCont);
  }
  catch (e) {}

  return config;
}

function saveConfig(data) {
  log(`save config to '${configPath}'`);

  fs.writeFileSync(configPath, stringify(data) , CONFIG_ENCODING);
}


module.exports = {
  loadConfig,
  saveConfig
};
