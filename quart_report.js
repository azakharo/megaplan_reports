#!/usr/bin/env node

'use strict';

const exit = process.exit;
const program = require('commander');
const { prompt } = require('inquirer');
const chalk = require('chalk');
var XLSX = require('xlsx');
const megaplan = require('megaplanjs');
const log = require('./utils').log;
const {getEmployees, getProjects, getTasks} = require('./call_megaplan');


async function main() {
// Parse the cmd line options
  program
    .version('0.1.0')
    .option('-s, --server [server]', 'Server URL, like \<name\>.megaplan.ru')
    .option('-u, --user [user]', 'Username')
    .option('-p, --password [password]', 'Password. If not specified, a user will be asked for it.')
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

  log(`Megaplan server: ${server}`);
  log(`Username: ${user}`);

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

  // Login
  const mpClient = await loginMegaplan(server, user, password);

  // Get data from Megaplan
  let data = null;
  try {
    data = await getReportData(mpClient);
  }
  catch (e) {
    log(chalk.red(`Could NOT get data from Megaplan: ${e}`));
    exit(3);
  }
  log(data);

  // Write data to XLSX
  // createXlsx(data);
}

// Start the program
main();


///////////////////////////////////////////////////////////
// Implementation

function loginMegaplan(server, username, password) {
  return new Promise(resolve => {
    const mpClient = new megaplan.Client(server)
      .auth(username, password);

    mpClient.on('auth', function (res, err) {
      if (err) {
        log(chalk.red('Could NOT connect to Megaplan'));
        log(err);
        exit(2);
      }
      log(chalk.green('Login SUCCESS'));

      resolve(mpClient);
    });

  });
}

async function getReportData(mpClient) {
  const employees = await getEmployees(mpClient);
  const projects = await getProjects(mpClient);
  const tasks = await getTasks(mpClient);

  return {
    employees,
    projects,
    tasks
  };
}

function createXlsx(data) {
  const wb = XLSX.utils.book_new();

  wb.Props = {
    Title: "Квартальный отчёт",
    Subject: "Стоимость работ / затраченное время, ресурсы",
    Author: "Алексей Захаров",
    CreatedDate: new Date()
  };

  wb.SheetNames.push("Лист 1");

  const ws_data = [['hello' , 'world']];  //a row with 2 columns

  const ws = XLSX.utils.aoa_to_sheet(ws_data);

  wb.Sheets["Лист 1"] = ws;

  XLSX.writeFile(wb, 'test.xlsx');
}
