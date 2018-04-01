'use strict';

const exit = process.exit;
const {values, isEmpty} = require('lodash');
const chalk = require('chalk');
const megaplan = require('megaplanjs');
const log = require('./utils').log;


function loginMegaplan(server, username, password) {
  return new Promise(resolve => {
    // Ignore self-signed ssl certificate in node.js with https.request
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
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

function getEmployees(mpClient) {
  return new Promise((resolve, reject) => {
    mpClient.employees().send(
      data => {
        let employees = [];
        if (!isEmpty(data) && data.employees) {
          employees = values(data.employees);
        }
        resolve(employees);
      },
      err => {
        log(chalk.red('Could NOT get employees'));
        reject(err);
      }
    );
  });
}

function getProjectsPage(mpClient, page, filterID) {
  const PAGE_SIZE = 50;
  return new Promise(resolve => {
    const options = {
      Detailed: true,
      Limit: PAGE_SIZE,
      Offset: PAGE_SIZE * page,
    };
    if (filterID) {
      options.FilterId = filterID;
    }
    mpClient.projects(options).send(
      data => {
        let projects = [];
        if (!isEmpty(data) && data.projects) {
          projects = values(data.projects);
        }
        resolve(projects);
      },
      () => {
        wait().then(() => {
          getProjectsPage(mpClient, page, filterID).then(
            projects => resolve(projects)
          );
        });
      }
    );
  });
}

async function getProjects(mpClient, filterID) {
  let projects = [];
  let projsOnPage = null;
  let page = 0;
  do {
    projsOnPage = await getProjectsPage(mpClient, page, filterID);
    if (projsOnPage.length > 0) {
      projects = projects.concat(projsOnPage);
      log(`Got next ${projsOnPage.length} projects. Total loaded: ${projects.length}`);
    }
    page += 1;
  } while (projsOnPage.length > 0);

  return projects;
}

function getTasksPage(mpClient, page, updatedAfter) {
  const PAGE_SIZE = 50;
  return new Promise(resolve => {
    const options = {Detailed: true, Limit: PAGE_SIZE, Offset: PAGE_SIZE * page};
    if (updatedAfter) {
      options.TimeUpdated = updatedAfter.toISOString();
    }
    mpClient.tasks(options).send(
      data => {
        let tasks = [];
        if (data) {
          tasks = values(data);
        }
        resolve(tasks);
      },
      () => {
        wait().then(() => {
          getTasksPage(mpClient, page, updatedAfter).then(
            tasks => resolve(tasks)
          );
        });
      }
    );
  });
}

async function getTasks(mpClient, updatedAfter) {
  let tasks = [];
  let tasksOnPage = null;
  let page = 0;
  do {
    tasksOnPage = await getTasksPage(mpClient, page, updatedAfter);
    if (tasksOnPage.length > 0) {
      tasks = tasks.concat(tasksOnPage);
      log(`Got next ${tasksOnPage.length} tasks. Total loaded: ${tasks.length}`);
    }
    page += 1;
  } while (tasksOnPage.length > 0);

  return tasks;
}

function getCommentsPage(mpClient, subject, entityID, page, updatedAfter) {
  const PAGE_SIZE = 50;
  return new Promise(resolve => {
    mpClient.comments_page(subject, entityID, PAGE_SIZE, page, updatedAfter).send(
      data => {
        let comments = [];
        if (data && data.comments) {
          comments = values(data.comments);
        }
        resolve(comments);
      },
      () => {
        wait().then(() => {
          getCommentsPage(mpClient, subject, entityID, page, updatedAfter).then(
            comments => resolve(comments)
          );
        });
      }
    );
  });
}

async function getComments(mpClient, subject, entityID, updatedAfter) {
  let comments = [];
  let commentsOnPage = null;
  let page = 0;
  do {
    commentsOnPage = await getCommentsPage(mpClient, subject, entityID, page, updatedAfter);
    if (commentsOnPage.length > 0) {
      comments = comments.concat(commentsOnPage);
    }
    page += 1;
  } while (commentsOnPage.length > 0);

  return comments;
}

async function getTaskComments(mpClient, taskID, updatedAfter) {
  return getComments(mpClient, 'task', taskID, updatedAfter);
}

async function getProjectComments(mpClient, projID, updatedAfter) {
  return getComments(mpClient, 'project', projID, updatedAfter);
}

function getExtraFields(mpClient, taskID) {
  return new Promise(resolve => {
    mpClient.task_extra_fields(taskID).send(
      data => {
        let extraFlds = [];
        if (!isEmpty(data) && data.fields) {
          extraFlds = values(data.fields);
        }
        resolve(extraFlds);
      },
      () => {
        wait().then(() => {
          getExtraFields(mpClient, taskID).then(
            extraFields => resolve(extraFields)
          );
        });
      }
    );
  });
}

function getTaskWithExtraFields(mpClient, taskID, extraFields) {
  return new Promise(resolve => {
    mpClient.task_with_extra_fields(taskID, extraFields).send(
      data => {
        resolve(data.task);
      },
      () => {
        wait().then(() => {
          getTaskWithExtraFields(mpClient, taskID, extraFields).then(
            task => resolve(task)
          );
        });
      }
    );
  });
}

function wait() {
  return new Promise(resolve => {
    log(chalk.magenta('The API limit has been reached, need the pause. Waiting...'));
    setTimeout(() => {
      resolve();
    }, 60000);
  });
}


module.exports = {
  loginMegaplan,
  getEmployees,
  getProjects,
  getTasks,
  getTaskComments,
  getProjectComments,
  getExtraFields,
  getTaskWithExtraFields
};
