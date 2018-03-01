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
  const tasks = filter(allTasks, task => filterByStartEnd(task, dtStart, dtEnd));
  log(`Tasks after filtering: ${tasks.length}`);
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
