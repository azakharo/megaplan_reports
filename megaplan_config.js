#!/usr/bin/env node

'use strict';

const { prompt } = require('inquirer');
const {loadConfig, saveConfig} = require('./config');


async function main() {
  const config = loadConfig();

  const questions = [
    {
      type: 'input',
      name: 'server',
      message: 'Please enter server: ',
      default: config.server
    },
    {
      type: 'input',
      name: 'username',
      message: 'Please enter username: ',
      default: config.username
    },
    {
      type: 'input',
      name: 'password',
      message: 'Please enter password: ',
      default: config.password
    },
    {
      type: 'integer',
      name: 'projectFilterID',
      message: 'Please project filter ID: ',
      default: config.projectFilterID
    },
  ];

  const answers = await prompt(questions);

  saveConfig(answers);
}

main();
