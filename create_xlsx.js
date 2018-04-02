'use strict';

const {concat, reduce, filter} = require('lodash');
const XLSX = require('xlsx');
const chalk = require('chalk');
const {getTimePeriodStr, log} = require('./utils');


module.exports = function createXlsx(data, dtStart, dtEnd, outdir) {
  const fldCoreHoursSpent = data.fldCoreHoursSpent;
  const fldCoreHoursPlanned = data.fldCoreHoursPlanned;

  log('Creating XLSX...');
  const SHEET_NAME = 'Лист 1';
  const wb = XLSX.utils.book_new();

  // Leave only employees who worked
  const allEmployees = data.employees;
  const employees = filter(allEmployees, e => e.totalWork > 0);

  // Document properties
  wb.Props = {
    Title: "Отчёт из Мегаплана",
    Subject: "Стоимость работ / затраченное время, ресурсы",
    Author: "",
    CreatedDate: new Date()
  };

  // Init variables
  let lineNum = 0;
  const emplColProps = employees.map(e => ({title: e.name, width: 18}));
  let colProps = [
    {title: 'Проект', width: 38},
    {title: `Задачи за ${getTimePeriodStr(dtStart, dtEnd)}`, width: 44},
    {title: 'Суммарное затраченное время с начала проекта', width: 23},
    {title: 'Затраченное время', width: 17},
    {title: 'Запланированное время', width: 21},
    {title: 'Затрач/запланир.', width: 15},
    {title: 'Ядро-часы затраченные', width: 17},
    {title: 'Ядро-часы запланированные', width: 18},
    {title: 'Ядро-часы затрач/запланир.', width: 15},
  ];
  const COL_PROJ = 0;
  const COL_TASK = 1;
  const COL_WORK_FROM_CARD = 2;
  const COL_WORK = 3;
  const COL_WORK_PLANNED = 4;
  const COL_WORK_PLANNED_RATIO = 5;
  const COL_CORE_HOURS = 6;
  const COL_CORE_HOURS_PLANNED = 7;
  const COL_CORE_HOURS_PLANNED_RATIO = 8;
  const employeeColStart = colProps.length;
  colProps = concat(colProps, emplColProps);
  const cols = colProps.map(c => ({wch: c.width}));

  // Create worksheet
  wb.SheetNames.push(SHEET_NAME);
  wb.Sheets[SHEET_NAME] = {
    '!ref': 'A1:',
    '!cols': cols
  };
  const ws = wb.Sheets[SHEET_NAME];

  // Draw the header
  colProps.forEach((col, colInd) => {
    const cell = {
      t: "s",
      v: col.title,
      s: {
        font: {
          bold: true
        }
      }
    };

    drawCell(cell, ws, lineNum, colInd);
  });
  lineNum += 1;

  // Leave only projects with real work or core hours during the specified period
  const allProjects = data.projects;
  const projects = filter(allProjects, p => p.totalWork > 0 || p.totalCoreHours);

  // Draw the data table's body
  const projLineStyle = {
    fill: {
      fgColor: {rgb: "FFFF75"} // Actually set's background
    },
    border: {
      top: {style: "thin", color: {auto: 1}},
      right: {style: "thin", color: {auto: 1}},
      bottom: {style: "thin", color: {auto: 1}},
      left: {style: "thin", color: {auto: 1}}
    }
  };
  projects.forEach(prj => {
    // Draw project line (totals)
    const projWorkFromCard = +prj.actual_work_with_sub_tasks;
    const projPlannedWork = +prj.planned_work;
    drawCell({t: 's', v: prj.name, s: projLineStyle}, ws, lineNum, COL_PROJ);
    drawCell({t: 's', v: '', s: projLineStyle}, ws, lineNum, COL_TASK);
    drawCell({t: 'n', z: '0', v: work2hours(projWorkFromCard), s: projLineStyle}, ws, lineNum, COL_WORK_FROM_CARD);
    drawCell({t: 'n', z: '0', v: work2hours(prj.totalWork), s: projLineStyle}, ws, lineNum, COL_WORK);
    drawCell({t: 'n', z: '0', v: work2hours(projPlannedWork), s: projLineStyle}, ws, lineNum, COL_WORK_PLANNED);
    if (projPlannedWork) {
      drawCell({t: 'n', z: '0.00', v: projWorkFromCard / projPlannedWork, s: projLineStyle}, ws,
        lineNum, COL_WORK_PLANNED_RATIO);
    }
    else {
      drawCell({t: 's', v: '', s: projLineStyle}, ws, lineNum, COL_WORK_PLANNED_RATIO);
    }
    drawCell({t: 'n', z: '0', v: prj.totalCoreHours, s: projLineStyle}, ws, lineNum, COL_CORE_HOURS);
    drawCell({t: 'n', z: '0', v: 0, s: projLineStyle}, ws, lineNum, COL_CORE_HOURS_PLANNED);
    drawCell({t: 'n', z: '0', v: 0, s: projLineStyle}, ws, lineNum, COL_CORE_HOURS_PLANNED_RATIO);
    // Draw work hours per employee
    employees.forEach((empl, emplInd) => {
      drawCell({t: 'n', z: '0', v: work2hours(empl.proj2work[prj.id] || 0), s: projLineStyle}, ws,
        lineNum, employeeColStart + emplInd);
    });
    lineNum += 1;

    // Draw the project's task lines
    prj.tasks.forEach(task => {
      const taskWorkFromCard = +task.actual_work_with_sub_tasks;
      const taskPlannedWork = +task.planned_work;
      drawCell({t: 's', v: task.name}, ws, lineNum, COL_TASK);
      drawCell({t: 'n', z: '0', v: work2hours(taskWorkFromCard)}, ws, lineNum, COL_WORK_FROM_CARD);
      drawCell({t: 'n', z: '0', v: work2hours(task.totalWork)}, ws, lineNum, COL_WORK);
      drawCell({t: 'n', z: '0', v: work2hours(taskPlannedWork)}, ws, lineNum, COL_WORK_PLANNED);
      if (taskPlannedWork) {
        drawCell({t: 'n', z: '0.00', v: taskWorkFromCard / taskPlannedWork}, ws, lineNum, COL_WORK_PLANNED_RATIO);
      }
      // Draw core hours columns
      const taskCoreHours = task[fldCoreHoursSpent.fieldNameInTask];
      const taskCoreHoursPlanned = task[fldCoreHoursPlanned.fieldNameInTask] || 0;
      drawCell({t: 'n', z: '0', v: taskCoreHours}, ws, lineNum, COL_CORE_HOURS);
      drawCell({t: 'n', z: '0', v: taskCoreHoursPlanned}, ws, lineNum, COL_CORE_HOURS_PLANNED);
      const taskCoreHoursRatio = taskCoreHoursPlanned ? taskCoreHours / taskCoreHoursPlanned : 0;
      drawCell({t: 'n', z: '0.00', v: taskCoreHoursRatio}, ws, lineNum, COL_CORE_HOURS_PLANNED_RATIO);
      // Draw work hours per employee
      employees.forEach((empl, emplInd) => {
        drawCell({t: 'n', z: '0', v: work2hours(task.employee2work[empl.id] || 0)}, ws, lineNum, employeeColStart + emplInd);
      });
      lineNum += 1;
    });
  });

  // Draw the final line (total-total)
  const allProjWorkFromCard = reduce(projects, (total, proj) => (total + (+proj.actual_work_with_sub_tasks)), 0);
  const allProjPlannedWork = reduce(projects, (total, proj) => (total + (+proj.planned_work)), 0);
  const totalLineStyle = {
    font: {bold: true},
    fill: {
      fgColor: {rgb: "FFFF75"} // Actually set's background
    },
    border: {
      top: {style: "thin", color: {auto: 1}},
      right: {style: "thin", color: {auto: 1}},
      bottom: {style: "thin", color: {auto: 1}},
      left: {style: "thin", color: {auto: 1}}
    }
  };
  drawCell({t: 's', v: 'ИТОГО за выбранный период',
    s: totalLineStyle}, ws, lineNum, COL_PROJ);
  drawCell({t: 's', v: '', s: totalLineStyle}, ws, lineNum, COL_TASK);
  drawCell({t: 'n', z: '0', v: work2hours(allProjWorkFromCard), s: totalLineStyle}, ws, lineNum, COL_WORK_FROM_CARD);
  drawCell({t: 'n', z: '0', v: work2hours(data.totalTotal), s: totalLineStyle}, ws, lineNum, COL_WORK);
  drawCell({t: 'n', z: '0', v: work2hours(allProjPlannedWork), s: totalLineStyle}, ws, lineNum, COL_WORK_PLANNED);
  if (allProjPlannedWork) {
    drawCell({t: 'n', z: '0.00', v: data.totalTotal / allProjPlannedWork, s: totalLineStyle}, ws,
      lineNum, COL_WORK_PLANNED_RATIO);
  }
  else {
    drawCell({t: 's', v: '', s: totalLineStyle}, ws, lineNum, COL_WORK_PLANNED_RATIO);
  }
  drawCell({t: 'n', z: '0', v: data.totalCoreHours, s: totalLineStyle}, ws, lineNum, COL_CORE_HOURS);
  drawCell({t: 'n', z: '0', v: data.totalCoreHoursPlanned, s: totalLineStyle}, ws, lineNum, COL_CORE_HOURS_PLANNED);
  if (data.totalCoreHoursPlanned) {
    drawCell({t: 'n', z: '0.00', v: data.totalCoreHours / data.totalCoreHoursPlanned, s: totalLineStyle}, ws,
      lineNum, COL_CORE_HOURS_PLANNED_RATIO);
  }
  // Draw work hours per employee
  employees.forEach((empl, emplInd) => {
    drawCell({t: 'n', z: '0', v: work2hours(empl.totalWork || 0), s: totalLineStyle}, ws,
      lineNum, employeeColStart + emplInd);
  });

  // Finalize the document (finalize ws)
  const lastColIndex = cols.length - 1;
  var endOfWsRange = XLSX.utils.encode_cell({c: lastColIndex, r: lineNum});
  ws['!ref'] += endOfWsRange;

  // Write report to file
  const DATE_PRINT_FRMT = 'DD.MM.YYYY_HH.mm';
  const xlsPath = `${outdir}/megaplan_report_${dtStart.format(DATE_PRINT_FRMT)}-${dtEnd.format(DATE_PRINT_FRMT)}.xlsx`;
  XLSX.writeFile(wb, xlsPath);
  log(chalk.green(`Saved report to '${xlsPath}'`));
};

function drawCell(cell, ws, row, col) {
  const cellAddress = {c: col, r: row};
  const cellRef = XLSX.utils.encode_cell(cellAddress);
  ws[cellRef] = cell;
}

function work2hours(work) {
  if (!work) {
    return 0;
  }
  return work / 60;
}
