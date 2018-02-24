'use strict';

const megaplan = require('megaplanjs');
const program = require('commander');
const log = require('./utils').log;
const exit = process.exit;


async function main() {
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
  const mpClient = await loginMegaplan(server, user, password);

  // Get data from Megaplan
  let data = null;
  try {
    data = await getReportData(mpClient);
  }
  catch (e) {
    log(`Could NOT get data from Megaplan: ${e}`);
    exit(3);
  }
  log(data);
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
        log('Could NOT connect to Megaplan');
        log(err);
        exit(2);
      }
      log('Login SUCCESS');

      resolve(mpClient);
    });

  });
}

function getReportData(mpClient) {
  return new Promise((resolve, reject) => {
    mpClient.projects().send(
      projects => resolve(projects),
      err => reject(err)
    );
  });
}
