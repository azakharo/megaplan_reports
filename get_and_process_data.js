'use strict';

const {filter, reduce} = require('lodash');
const moment = require('moment');
const chalk = require('chalk');
const megaplanjs_utils = require('megaplanjs/lib/utils');
const {getEmployees, getProjects, getTasks, getTaskComments, getProjectComments,
  getExtraFields, getTaskWithExtraFields} = require('./call_megaplan');
const {log, stringify, logData} = require('./utils');


module.exports = async function getReportData(mpClient, dtStart, dtEnd, projectFilterID) {
  const employees = await getEmployees(mpClient);
  log(`Loaded ${employees.length} employees`);

  const allProjects = await getProjects(mpClient, projectFilterID);
  log(`Loaded ${allProjects.length} projects`);
  const projects = allProjects;

  // Get comments per projects
  log('Loading project comments...');
  for (const [projInd, proj ] of projects.entries()) {
    let allComments = null;
    try {
      allComments = await getProjectComments(mpClient, proj.id, dtStart);
    }
    catch (e) {
      log(chalk.red(stringify(e)));
      exit(2);
    }

    // Filter comments
    const commentsFiltered = filter(allComments, getCommentFilter(dtStart, dtEnd));

    log(`project ${projInd + 1}/${projects.length}: loaded ${allComments.length} comments, after filtering ${commentsFiltered.length}`);

    // Associate comments with proj
    proj.comments = commentsFiltered;
  }

  const allTasks = await getTasks(mpClient);
  log(`Loaded ${allTasks.length} tasks`);
  // Filter tasks by activity time
  let tasks = filter(allTasks, task => filterTaskByActivityTime(task, dtStart));
  log(`Tasks after filtering by activity time: ${tasks.length}`);
  // Filter tasks by creation time
  tasks = filter(tasks, task => filterTaskByCreationTime(task, dtEnd));
  log(`Tasks after filtering by creation time: ${tasks.length}`);

  // Get task extra field names
  let taskExtraFields = [];
  let fldCoreHoursSpent = null;
  let fldCoreHoursPlanned = null;
  for (const task of tasks) {
    const extraFields = await getExtraFields(mpClient, task.id);
    if (Array.isArray(extraFields) && extraFields.length > 0) {
      taskExtraFields = extraFields;

      const fieldDispNames = extraFields.map(f => f.translation);
      log(`Found task extra fields: ${fieldDispNames.join(', ')}`);

      const CORE = 'ядро';
      log(`Filter out fields which do not contain '${CORE}'`);
      taskExtraFields = filter(taskExtraFields, f => f.translation.toLowerCase().indexOf(CORE) !== -1);
      if (taskExtraFields.length === 2) {
        fldCoreHoursSpent = taskExtraFields[0];
        fldCoreHoursPlanned = taskExtraFields[1];
      }

      for (const fld of taskExtraFields) {
        fld.fieldNameInTask = megaplanjs_utils.toUnderscore(fld.name);
      }

      if (fldCoreHoursSpent) {
        log(`Found core hours spent field name: '${fldCoreHoursSpent.translation}'`);
      }
      else {
        log(chalk.red('Could not find core hours spent field name'));
      }

      if (fldCoreHoursPlanned) {
        log(`Found core hours planned field name: '${fldCoreHoursPlanned.translation}'`);
      }
      else {
        log(chalk.red('Could not find core hours planned field name'));
      }

      break;
    }
  }
  if (taskExtraFields && taskExtraFields.length === 0) {
    log(chalk.red('could not find task extra fields'));
  }

  // For each task get core hours spent and planned
  if (taskExtraFields.length > 0) {
    log('Loading task extra fields...');
    for (const [taskInd, task] of tasks.entries()) {
      const taskWithExtraFlds = await getTaskWithExtraFields(mpClient, task.id, taskExtraFields);
      let logStr = "";
      for (const fld of taskExtraFields) {
        const fldName = fld.fieldNameInTask;
        const fldVal = +taskWithExtraFlds[fldName];
        const fldDispName = fld.translation;
        task[fldName] = fldVal;
        logStr += `${fldDispName}=${fldVal} `;
      }
      log(`task ${taskInd + 1}/${tasks.length}: loaded ${logStr}`);
    }
  }

  // Find tasks which do not belong to particular project.
  // Add dummy project and put the found tasks into it
  const tasksWoutProj = filter(tasks, task => !task.project);
  if (tasksWoutProj.length > 0) {
    log(`Found ${tasksWoutProj.length} tasks wiout project.`);

    const dummyProject = {
      id: -1,
      name: 'Задачи без проекта',
      comments: []
    };
    projects.push(dummyProject);

    tasksWoutProj.forEach(t => {
      t.project = dummyProject;
    });
  }

  // Get comments per task
  log('Loading task comments...');
  for (const [taskInd, task] of tasks.entries()) {
    let allComments = null;
    try {
      allComments = await getTaskComments(mpClient, task.id, dtStart);
    }
    catch (e) {
      log(chalk.red(stringify(e)));
      exit(2);
    }

    // Filter comments
    const commentsFiltered = filter(allComments, getCommentFilter(dtStart, dtEnd));

    log(`task ${taskInd + 1}/${tasks.length}: loaded ${allComments.length} comments, after filtering ${commentsFiltered.length}`);

    // Associate comments with task
    task.comments = commentsFiltered;
  }

  log(chalk.green('Loaded data from Megaplan'));

  // Remove tasks if no comments or no spent core hours
  const tasksBeforeCommentFilterCount = tasks.length;
  tasks = filter(tasks, t => t.comments.length > 0 || (fldCoreHoursSpent && t[fldCoreHoursSpent.fieldNameInTask]));
  const tasksWithCommentsCount = tasks.length;
  if (tasksWithCommentsCount !== tasksBeforeCommentFilterCount) {
    log(`Found ${tasksBeforeCommentFilterCount - tasksWithCommentsCount} tasks w/out comments or core hours. They are ignored.`);
    log(`Tasks remaining after all the filtering: ${tasks.length}`);
  }

  log('Calculate work per task');
  for (const task of tasks) {
    calcTaskWork(task);
  }

  log('Calculate work per project');
  for (const proj of projects) {
    calcProjectWork(proj, tasks, fldCoreHoursSpent, fldCoreHoursPlanned);
  }

  log('Calculate work per employee (total)');
  for (const empl of employees) {
    calcEmployeeWork(empl, projects, tasks);
  }

  log('Calculate employee work per project');
  employees.forEach(empl => {
    empl.proj2work = {};
    projects.forEach(proj => {
      const projCommentWork = proj.employee2projCommentWork[empl.id] || 0;

      empl.proj2work[proj.id] =
        reduce(proj.tasks, (total, task) => (total + (task.employee2work[empl.id] || 0)), projCommentWork);
    });
  });

  const totalTotal = reduce(projects, (total, proj) => (total + proj.totalWork), 0);
  log(`TOTAL work for the specified period: ${totalTotal} minutes OR ${(totalTotal / 60).toFixed(1)} hours`);

  // Calc total core hours
  const totalCoreHours = reduce(projects, (total, proj) => (total + proj.totalCoreHours), 0);
  log(`TOTAL core hours: ${totalCoreHours}`);
  const totalCoreHoursPlanned = reduce(projects, (total, proj) => (total + proj.totalCoreHoursPlanned), 0);
  log(`TOTAL core hours planned: ${totalCoreHoursPlanned}`);

  return {
    employees,
    projects,
    tasks,
    totalTotal,
    totalCoreHours,
    totalCoreHoursPlanned,
    fldCoreHoursSpent,
    fldCoreHoursPlanned
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

function calcProjectWork(proj, tasks, fldCoreHoursSpent, fldCoreHoursPlanned) {
  proj.employee2projCommentWork = {};
  proj.totalProjCommentWork = 0;

  proj.comments.forEach(comment => {
    const empID = comment.author.id;
    const work = comment.work;

    const prevWork = proj.employee2projCommentWork[empID] || 0;
    proj.employee2projCommentWork[empID] = prevWork + work;

    proj.totalProjCommentWork += work;
  });

  proj.tasks = filter(tasks, t => t.project.id === proj.id);
  proj.totalWork = reduce(proj.tasks, (total, task) => (total + task.totalWork), proj.totalProjCommentWork);
  if (fldCoreHoursSpent) {
    proj.totalCoreHours = reduce(proj.tasks, (total, task) => (total + task[fldCoreHoursSpent.fieldNameInTask]), 0);
  }
  if (fldCoreHoursPlanned) {
    proj.totalCoreHoursPlanned = reduce(proj.tasks, (total, task) => (total + task[fldCoreHoursPlanned.fieldNameInTask]), 0);
  }
}

function calcEmployeeWork(empl, projects, tasks) {
  empl.totalWork = 0;

  // Add work made by task comments
  tasks.forEach(task => {
    const taskWork = task.employee2work[empl.id];
    if (taskWork) {
      empl.totalWork += taskWork;
    }
  });

  // Add work made by project comments
  projects.forEach(proj => {
    const work = proj.employee2projCommentWork[empl.id];
    if (work) {
      empl.totalWork += work;
    }
  });
}


function filterTaskByActivityTime(task, start) {
  return moment(task.activity).isSameOrAfter(start);
}

function filterTaskByCreationTime(task, end) {
  return moment(task.time_created).isSameOrBefore(moment(end).add(1, 'months'));
}

const getCommentFilter = (dtStart, dtEnd) => (comment) => {
  const dt = moment(comment.work_date || comment.time_created);
  return comment.work && (dt.isSameOrAfter(dtStart) && dt.isSameOrBefore(dtEnd));
};
