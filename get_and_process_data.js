'use strict';

const {filter, reduce} = require('lodash');
const moment = require('moment');
const chalk = require('chalk');
const {getEmployees, getProjects, getTasks, getComments} = require('./call_megaplan');
const {log, stringify, logData} = require('./utils');


module.exports = async function getReportData(mpClient, dtStart, dtEnd, projectFilterID) {
  const employees = await getEmployees(mpClient);
  log(`Loaded ${employees.length} employees`);

  const allProjects = await getProjects(mpClient, projectFilterID);
  log(`Loaded ${allProjects.length} projects`);
  const projects = allProjects;
  // // Filter projects by start, end
  // const projects = filter(allProjects, prj => filterByStartEnd(prj, dtStart, dtEnd));
  // log(`Projects after filtering: ${projects.length}`);

  const allTasks = await getTasks(mpClient, dtStart);
  log(`Loaded ${allTasks.length} tasks`);
  // Filter tasks by start, end
  let tasks = filter(allTasks, task => filterTaskByStartEnd(task, dtStart, dtEnd));
  log(`Tasks after filtering by start/end time: ${tasks.length}`);
  // Remove tasks which do not belong to particular project
  const tasksBeforeProjFilter = tasks.length;
  tasks = filter(tasks, task => task.project && task.project.id);
  const tasksAfterProjFilter = tasks.length;
  if (tasksBeforeProjFilter !== tasksAfterProjFilter) {
    log(chalk.magenta(`Found ${tasksBeforeProjFilter - tasksAfterProjFilter} tasks wiout project. They are ignored.`));
  }

  // Get comments per task
  log('Loading comments...');
  for (const [taskInd, task ] of tasks.entries()) {
    let allComments = null;
    try {
      allComments = await getComments(mpClient, task.id, dtStart);
    }
    catch (e) {
      log(chalk.red(stringify(e)));
      exit(2);
    }

    // Filter comments
    const commentsFiltered = filter(allComments, c => {
      const dt = moment(c.work_date);
      return c.work && (dt.isSameOrAfter(dtStart) && dt.isSameOrBefore(dtEnd));
    });

    log(`task ${taskInd + 1}/${tasks.length}: loaded ${allComments.length} comments, after filtering ${commentsFiltered.length}`);

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

  log('Calculate work per task');
  for (const task of tasks) {
    calcTaskWork(task);
  }

  log('Calculate work per project');
  projects.forEach(proj => {
    proj.tasks = filter(tasks, t => t.project.id === proj.id);
    proj.totalWork = reduce(proj.tasks, (total, task) => (total + task.totalWork), 0);
  });

  log('Calculate work per employee (total)');
  employees.forEach(empl => {
    empl.totalWork = 0;
    tasks.forEach(task => {
      const taskWork = task.employee2work[empl.id];
      if (taskWork) {
        empl.totalWork += taskWork;
      }
    });
  });

  log('Calculate employee work per project');
  employees.forEach(empl => {
    empl.proj2work = {};
    projects.forEach(proj => {
      empl.proj2work[proj.id] =
        reduce(proj.tasks, (total, task) => (total + (task.employee2work[empl.id] || 0)), 0);
    });
  });

  const totalTotal = reduce(projects, (total, proj) => (total + proj.totalWork), 0);
  log(`TOTAL work for the specified period: ${totalTotal} minutes OR ${(totalTotal / 60).toFixed(1)} hours`);

  return {
    employees,
    projects,
    tasks,
    totalTotal
  };
};

function calcTaskWork(task) {
  task.employee2work = {};
  task.totalWork = 0;

  task.comments.forEach(comment => {
    const empID = comment.author.id;
    const work = comment.work;

    const prevWork = task.employee2work[empID] || 0;
    task.employee2work[empID] = prevWork + work;

    task.totalWork += work;
  });
}

function filterTaskByStartEnd(task, start, end) {
  return !(moment(task.time_created).isSameOrAfter(end) || moment(task.time_updated).isSameOrBefore(start));
}
