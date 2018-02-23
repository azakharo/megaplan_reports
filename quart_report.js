var megaplan = require ('megaplanjs');
var client = new megaplan.Client('mp72471385.megaplan.ru')
  .auth('zangular@yandex.ru', '755525f3');
client.on('auth', function (res, err) {
    // store res.access_id, res.secret_key if you need these (see below)
    console.log('authenticated', res, err);

    client.projects().send(function (tasks) {
        console.log(tasks); // a lot of results
    }, function (err) {
        console.log(err);
    });
});
