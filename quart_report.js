const megaplan = require('megaplanjs');
const program = require('commander');
const log = require('./utils').log;
const exit = process.exit;


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

// const client = new megaplan.Client('mp72471385.megaplan.ru')
//   .auth('zangular@yandex.ru', '755525f3');
//
// client.on('auth', function (res, err) {
//   // store res.access_id, res.secret_key if you need these (see below)
//   console.log('authenticated', res, err);
//
//   client.projects().send(function (tasks) {
//     console.log(tasks); // a lot of results
//   }, function (err) {
//     console.log(err);
//   });
// });
