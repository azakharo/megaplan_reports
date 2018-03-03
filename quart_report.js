#!/usr/bin/env node

'use strict';

const exit = process.exit;
const fs = require('fs');
const moment = require('moment');
const program = require('commander');
const { prompt } = require('inquirer');
const chalk = require('chalk');
const {log, stringify, getTimePeriodStr} = require('./utils');
const {loginMegaplan} = require('./call_megaplan');
const getReportData = require('./get_and_process_data');
const createXlsx = require('./create_xlsx');


async function main() {
  // Parse the cmd line options
  const INPUT_DATE_FRMT = 'DD.MM.YYYY';
  program
    .version('0.1.0')
    .option('-s, --server [server]', 'Server URL, like \<name\>.megaplan.ru')
    .option('-u, --user [user]', 'Username')
    .option('-p, --password [password]', 'Password. If not specified, a user will be asked for it.')
    .option('--start [start]', `Time period start in format '${INPUT_DATE_FRMT}'. If omitted, the beginning of currect month is used.`)
    .option('--end [end]', `Time period end in format '${INPUT_DATE_FRMT}'. If omitted, current date is used.`)
    .option('-o, --outdir [outdir]', 'Directory to place the report into. If not specified, the current working directory is used.')
    .parse(process.argv);

  const server = program.server;
  if (!server) {
    log(chalk.red('Please specify the server'));
    exit(1);
  }

  const user = program.user;
  if (!user) {
    log(chalk.red('Please specify the username'));
    exit(1);
  }

  log(chalk.yellow(`Megaplan server: ${server}`));
  log(chalk.yellow(`Username: ${user}`));

  let password = program.password;
  if (!password) {
    const questions = [{
      type: 'input',
      name: 'password',
      message: 'Please enter password: '
    }];

    const answers = await prompt(questions);
    password = answers.password;
    if (!password) {
      log(chalk.red('Please specify the password'));
      exit(1);
    }
  }

  let dtStart = moment().startOf('month');
  let dtEnd = moment();
  if (program.start) {
    dtStart = moment(program.start, INPUT_DATE_FRMT, true);
    if (!dtStart.isValid()) {
      log(chalk.red(`Invalid time period START: ${program.start}`));
      exit(1);
    }
    dtStart = dtStart.startOf('day');
  }
  if (program.end) {
    dtEnd = moment(program.end, INPUT_DATE_FRMT, true);
    if (!dtEnd.isValid()) {
      log(chalk.red(`Invalid time period END: ${program.end}`));
      exit(1);
    }
    dtEnd = dtEnd.endOf('day');
  }
  if (dtStart.isSameOrAfter(dtEnd)) {
    log(chalk.red(`Invalid time period: ${getTimePeriodStr(dtStart, dtEnd)}`));
    exit(1);
  }
  log(chalk.yellow(`Time period: ${getTimePeriodStr(dtStart, dtEnd)}`));

  const outdir = program.outdir || process.cwd();

  let data = null;
  // Login
  const mpClient = await loginMegaplan(server, user, password);

  // Get data from Megaplan
  try {
    data = await getReportData(mpClient, dtStart, dtEnd);
  }
  catch (e) {
    log(chalk.red(`Could NOT get data from Megaplan: ${e}`));
    exit(3);
  }

  // Write data to XLSX
  createXlsx(data, dtStart, dtEnd, outdir);
}

// Start the program
main();
