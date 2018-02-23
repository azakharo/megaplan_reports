'use strict';

const megaplan = require('megaplanjs');
const program = require('commander');
const log = require('./utils').log;
const exit = process.exit;


// Parse the cmd line options
program
  .version('0.1.0')
  .option('-s, --server [server]', 'Server URL, like \<name\>.megaplan.ru')
  .option('-u, --user [user]', 'Username')
  .option('-p, --password [password]', 'Password')
  .parse(process.argv);

const server = program.server;
if (!server) {
  log('Please specify the server');
  exit(1);
}

const user = program.user;
if (!user) {
  log('Please specify the username');
  exit(1);
}

const password = program.password;
if (!password) {
  log('Please specify the password');
  exit(1);
}

log(`Megaplan server: ${server}`);
log(`Username: ${user}`);


// Login
loginMegaplan(server, user, password, getReportData);


///////////////////////////////////////////////////////////
// Implementation

function loginMegaplan(server, username, password, onSuccess) {
  const mpClient = new megaplan.Client(server)
    .auth(username, password);

  mpClient.on('auth', function (res, err) {
    if (err) {
      log('Could NOT connect to Megaplan');
      log(err);
      exit(2);
    }

    onSuccess(mpClient);
  });

}

function getReportData(mpClient) {
  mpClient.projects().send(
    projects => log(projects),
    err => log(err)
  );
}
