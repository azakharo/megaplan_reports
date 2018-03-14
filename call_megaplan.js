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
      err => reject(err)
    );
  });
}

function getProjectsPage(mpClient, page, filterID) {
  const PAGE_SIZE = 50;
  return new Promise((resolve, reject) => {
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
      err => reject(err)
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
  return new Promise((resolve, reject) => {
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
      err => reject(err)
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

function getCommentsPage(mpClient, taskID, page, updatedAfter) {
  const PAGE_SIZE = 50;
  return new Promise((resolve, reject) => {
    mpClient.task_comments_page(taskID, PAGE_SIZE, page, updatedAfter).send(
      data => {
        let comments = [];
        if (data && data.comments) {
          comments = values(data.comments);
        }
        resolve(comments);
      },
      err => reject(err)
    );
  });
}

async function getComments(mpClient, taskID, updatedAfter) {
  let comments = [];
  let commentsOnPage = null;
  let page = 0;
  do {
    commentsOnPage = await getCommentsPage(mpClient, taskID, page, updatedAfter);
    if (commentsOnPage.length > 0) {
      comments = comments.concat(commentsOnPage);
    }
    page += 1;
  } while (commentsOnPage.length > 0);

  return comments;
}

function getExtraFields(mpClient, taskID) {
  return new Promise((resolve, reject) => {
    mpClient.task_extra_fields(taskID).send(
      data => {
        let extraFlds = [];
        if (!isEmpty(data) && data.fields) {
          extraFlds = values(data.fields);
        }
        resolve(extraFlds);
      },
      err => reject(err)
    );
  });
}

function getTaskWithExtraFields(mpClient, taskID, extraFields) {
  return new Promise((resolve, reject) => {
    mpClient.task_with_extra_fields(taskID, extraFields).send(
      data => {
        resolve(data.task);
      },
      err => reject(err)
    );
  });
}


module.exports = {
  loginMegaplan,
  getEmployees,
  getProjects,
  getTasks,
  getComments,
  getExtraFields,
  getTaskWithExtraFields
};
