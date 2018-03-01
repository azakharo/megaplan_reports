'use strict';

const {filter} = require('lodash');
const moment = require('moment');
const {getEmployees, getProjects, getTasks, getComments} = require('./call_megaplan');
const {log, stringify, logData} = require('./utils');


module.exports = async function getReportData(mpClient, dtStart, dtEnd) {
  const employees = await getEmployees(mpClient);
  log(`Loaded ${employees.length} employees`);

  const allProjects = await getProjects(mpClient);
  log(`Loaded ${allProjects.length} projects`);
  // Filter projects by start, end
  const projects = filter(allProjects, prj => filterByStartEnd(prj, dtStart, dtEnd));
  log(`Projects after filtering: ${projects.length}`);
  // for (const prj of projects) {
  //   logData(prj);
  // }

  const allTasks = await getTasks(mpClient);
  log(`Loaded ${allTasks.length} tasks`);
  // TODO tasks detailed or not?
  // TODO request tasks with filter?
  // Filter tasks by start, end
  let tasks = filter(allTasks, task => filterByStartEnd(task, dtStart, dtEnd));
  log(`Tasks after filtering by start/end time: ${tasks.length}`);
  // for (const task of tasks) {
  //   logData(task);
  // }

  // Get comments per task
  log('Loading comments...');
  for (const task of tasks) {
    let allComments = null;
    try {
      allComments = await getComments(mpClient, task.id);
    }
    catch (e) {
      log(chalk.red(stringify(e)));
      exit(2);
    }

    // Filter comments
    const commentsFiltered = filter(allComments, c => {
      const dt = moment(c.time_created);
      return c.work && (dt.isSameOrAfter(dtStart) && dt.isSameOrBefore(dtEnd));
    });

    log(`'${task.name}' comments loaded ${allComments.length}, after filtering: ${commentsFiltered.length}`);

    // Associate comments with task
    task.comments = commentsFiltered;
  }

  // Remove tasks with no comments
  const tasksBeforeCommentFilterCount = tasks.length;
  tasks = filter(tasks, t => t.comments.length > 0);
  const tasksWithCommentsCount = tasks.length;
  if (tasksWithCommentsCount !== tasksBeforeCommentFilterCount) {
    log(`Found ${tasksBeforeCommentFilterCount - tasksWithCommentsCount} tasks w/out comments. They are ignored.`);
    log(`Tasks remaining after all the filtering: ${tasks.length}`);
  }

  // Calc works for tasks
  for (const task of tasks) {
    calcTaskWork(task);
    logData(task);
  }

  // return {
  //   employees,
  //   projects,
  //   tasks
  // };
  return {};
};

function calcTaskWork(task) {
  task.employee2work = {};
  task.totalWork = 0;

  task.comments.forEach(comment => {
    const empID = comment.author.id;
    const work = comment.work;

    if (task.employee2work[empID]) {
      task.employee2work[empID] += work;
    }
    else {
      task.employee2work[empID] = work;
    }

    task.totalWork += work;
  });
}

function filterByStartEnd(entity, start, end) {
  return !(moment(entity.time_created).isSameOrAfter(end) || moment(entity.time_updated).isSameOrBefore(start));
}
