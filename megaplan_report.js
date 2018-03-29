#!/usr/bin/env node

'use strict';

const exit = process.exit;
const fs = require('fs');
const moment = require('moment');
require('moment-precise-range-plugin/moment-precise-range');
const program = require('commander');
const { prompt } = require('inquirer');
const chalk = require('chalk');
const {log, stringify, getTimePeriodStr, logData} = require('./utils');
const {loginMegaplan} = require('./call_megaplan');
const getReportData = require('./get_and_process_data');
const createXlsx = require('./create_xlsx');
const {loadConfig} = require('./config');
const {extendMegaplanClient} = require('./extend_megaplanjs');

async function main() {
  const config = loadConfig();

  // Parse the cmd line options
  const INPUT_DATE_FRMT = 'DD.MM.YYYY';
  program
    .version('0.1.0')
    .option('-s, --server [server]', 'Server URL, like \<name\>.megaplan.ru')
    .option('-u, --user [user]', 'Username')
    .option('-p, --password [password]', 'Password. If not specified, a user will be asked for it.')
    .option('--start [start]', `Time period START in format '${INPUT_DATE_FRMT}'`)
    .option('--end [end]', `Time period END in format '${INPUT_DATE_FRMT}'`)
    .option('-o, --outdir [outdir]', 'Directory to place the report into. If not specified, the current working directory is used.')
    .option('--projectFilterID [projectFilterID]', `Filter ID necessary for getting all projects`)
    .parse(process.argv);

  let server = program.server;
  if (!server) {
    server = config.server;
  }
  if (!server) {
    log(chalk.red('Please specify the server'));
    exit(1);
  }

  let user = program.user;
  if (!user) {
    user = config.username;
  }
  if (!user) {
    log(chalk.red('Please specify the username'));
    exit(1);
  }

  log(chalk.yellow(`Megaplan server: ${server}`));
  log(chalk.yellow(`Username: ${user}`));

  let password = program.password;
  if (!password) {
    password = config.password;
  }
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

  let dtStart = null;
  if (program.start) {
    dtStart = moment(program.start, INPUT_DATE_FRMT, true);
    if (!dtStart.isValid()) {
      log(chalk.red(`Invalid time period START: ${program.start}`));
      exit(1);
    }
  }
  else {
    const questions = [{
      type: 'input',
      name: 'start',
      message: `Time period START in format '${INPUT_DATE_FRMT}' (leave blank for the beginning of currect month): `
    }];

    const answers = await prompt(questions);
    if (!answers.start) {
      dtStart = moment().startOf('month');
    }
    else {
      dtStart = moment(answers.start, INPUT_DATE_FRMT, true);
      if (!dtStart.isValid()) {
        log(chalk.red(`Invalid time period START: ${answers.start}`));
        exit(1);
      }
    }
  }
  dtStart = dtStart.startOf('day');

  let dtEnd = null;
  if (program.end) {
    dtEnd = moment(program.end, INPUT_DATE_FRMT, true);
    if (!dtEnd.isValid()) {
      log(chalk.red(`Invalid time period END: ${program.end}`));
      exit(1);
    }
    dtEnd = dtEnd.endOf('day');
  }
  else {
    const questions = [{
      type: 'input',
      name: 'end',
      message: `Time period END in format '${INPUT_DATE_FRMT}' (leave blank for today): `
    }];

    const answers = await prompt(questions);
    if (!answers.end) {
      dtEnd = moment();
    }
    else {
      dtEnd = moment(answers.end, INPUT_DATE_FRMT, true);
      if (!dtEnd.isValid()) {
        log(chalk.red(`Invalid time period END: ${answers.end}`));
        exit(1);
      }
      dtEnd = dtEnd.endOf('day');
    }
  }

  // Validate time period
  if (dtStart.isSameOrAfter(dtEnd)) {
    log(chalk.red(`Invalid time period: ${getTimePeriodStr(dtStart, dtEnd)}`));
    exit(1);
  }
  log(chalk.yellow(`Time period: ${getTimePeriodStr(dtStart, dtEnd)}`));

  const outdir = program.outdir || process.cwd();

  let projectFilterID = program.projectFilterID;
  if (!projectFilterID) {
    projectFilterID = config.projectFilterID;
  }
  if (projectFilterID) {
    projectFilterID = parseInt(projectFilterID, 10);
  }


  // Extend megaplanjs package with some helper methods
  extendMegaplanClient();

  const scriptStartDt = moment();
  let data = null;

  // let fileCont = null;
  // try {
  //   fileCont = fs.readFileSync('C:\\NewTemp\\megaplan.json', 'utf8');
  // }
  // catch (e) {
  // }
  //
  // if (!fileCont) {

    // Login
    const mpClient = await loginMegaplan(server, user, password);

    // Get data from Megaplan
    try {
      data = await getReportData(mpClient, dtStart, dtEnd, projectFilterID);
    }
    catch (e) {
      log(chalk.red(`Could NOT get data from Megaplan: ${stringify(e)}`));
      exit(2);
    }
    log(chalk.green('Prepared data for report'));

    fs.writeFileSync('C:\\megaplan.json', stringify(data), 'utf8');
  // }
  // else {
  //   try {
  //     data = JSON.parse(fileCont);
  //   }
  //   catch (e) {
  //     logData(e);
  //     exit(2);
  //   }
  // }

  // Write data to XLSX
  try {
    createXlsx(data, dtStart, dtEnd, outdir);
  }
  catch (err) {
    let errMsg;
    if (err.syscall === "open" && err.code === "EBUSY") {
      errMsg = `Не удалось сохранить отчёт в файл '${err.path}', т.к. данный файл уже существует и открыт в Excel или OpenOffice.`;
    }
    else {
      errMsg = `Could NOT create XLS: ${stringify(err)}`;
    }
    log(chalk.red(errMsg));
    exit(3);
  }

  // Print script exec time
  const scriptEndDt = moment();
  log(`Exec time: ${moment.preciseDiff(scriptStartDt, scriptEndDt)}`);
  log(chalk.green('OK'));
}

// Start the program
main();
