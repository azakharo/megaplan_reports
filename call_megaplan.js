'use strict';

const {values, isEmpty} = require('lodash');


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

function getProjects(mpClient) {
  return new Promise((resolve, reject) => {
    mpClient.projects({Detailed: true}).send(
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

function getTasks(mpClient) {
  return new Promise((resolve, reject) => {
    mpClient.tasks({Detailed: true}).send(
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

function getComments(mpClient, taskID) {
  return new Promise((resolve, reject) => {
    mpClient.task_comments(taskID).send(
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

module.exports = {
  getEmployees,
  getProjects,
  getTasks,
  getComments
};
