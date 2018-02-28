'use strict';

const {filter} = require('lodash');
const moment = require('moment');
const {getEmployees, getProjects, getTasks, getComments} = require('./call_megaplan');
const {log, logData} = require('./utils');


module.exports = async function getReportData(mpClient, dtStart, dtEnd) {
  const employees = await getEmployees(mpClient);

  const allProjects = await getProjects(mpClient);
  // Filter projects by start, end
  const projects = filter(allProjects, prj => filterByStartEnd(prj, dtStart, dtEnd));
  // for (const prj of projects) {
  //   logData(prj);
  // }

  const allTasks = await getTasks(mpClient);
  // TODO tasks detailed or not?
  // TODO request tasks with filter?
  // Filter tasks by start, end
  const tasks = filter(allTasks, task => filterByStartEnd(task, dtStart, dtEnd));
  // for (const task of tasks) {
  //   logData(task);
  // }

  // // Get comments per task
  // // Filter comments, leave only if:
  // // work comment
  // // datatime is from the range
  // // Associate comments with task
  // for (const task of tasks) {
  //   let comments = null;
  //   try {
  //     comments = await getComments(mpClient, task.id);
  //     // if (comments.length > 0) {
  //     //   log(`TASK ${task.name}`);
  //     //   log(JSON.stringify(comments, null, 2));
  //     //   log('==================================');
  //     // }
  //   }
  //   catch (e) {
  //     log(chalk.red(JSON.stringify(e, null, 2)));
  //   }
  // }
  //
  // return {
  //   employees,
  //   projects,
  //   tasks
  // };
  return {};
};

function filterByStartEnd(entity, start, end) {
  return !(moment(entity.time_created).isSameOrAfter(end) || moment(entity.time_updated).isSameOrBefore(start));
}
