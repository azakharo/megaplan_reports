'use strict';

const {concat, reduce} = require('lodash');
const XLSX = require('xlsx');
const {getTimePeriodStr, log} = require('./utils');


module.exports = function createXlsx(data, dtStart, dtEnd, outdir) {
  const SHEET_NAME = 'Лист 1';
  const wb = XLSX.utils.book_new();

  // Document properties
  wb.Props = {
    Title: "Отчёт из Мегаплана",
    Subject: "Стоимость работ / затраченное время, ресурсы",
    Author: "",
    CreatedDate: new Date()
  };

  // Init variables
  let lineNum = 0;
  const emplColProps = data.employees.map(e => ({title: e.name, width: 18}));
  let colProps = [
    {title: 'Проект', width: 30},
    {title: `Задачи за ${getTimePeriodStr(dtStart, dtEnd)}`, width: 44},
    {title: 'Затрач. время из карточки', width: 23},
    {title: 'Затраченное время', width: 17},
    {title: 'Запланированное время', width: 21},
    {title: 'Затрач/запланир.', width: 15}
  ];
  const COL_PROJ = 0;
  const COL_TASK = 1;
  const COL_WORK_FROM_CARD = 2;
  const COL_WORK = 3;
  const COL_WORK_PLANNED = 4;
  const COL_WORK_PLANNED_RATION = 5;
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

  // Draw the data table's body
  const projects = data.projects;
  const employees = data.employees;
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
      drawCell({t: 'n', z: '0.00', v: prj.totalWork / projPlannedWork, s: projLineStyle}, ws,
        lineNum, COL_WORK_PLANNED_RATION);
    }
    else {
      drawCell({t: 's', v: '', s: projLineStyle}, ws, lineNum, COL_WORK_PLANNED_RATION);
    }
    // Draw work hours per employee
    employees.forEach((empl, emplInd) => {
      drawCell({t: 'n', z: '0.0', v: work2hours(empl.proj2work[prj.id] || 0), s: projLineStyle}, ws,
        lineNum, employeeColStart + emplInd);
    });
    lineNum += 1;

    // Draw the project's task lines
    prj.tasks.forEach(task => {
      const taskWorkFromCard = +task.actual_work_with_sub_tasks;
      const taskPlannedWork = +task.planned_work;
      drawCell({t: 's', v: task.name}, ws, lineNum, COL_TASK);
      drawCell({t: 'n', z: '0.0', v: work2hours(taskWorkFromCard)}, ws, lineNum, COL_WORK_FROM_CARD);
      drawCell({t: 'n', z: '0.0', v: work2hours(task.totalWork)}, ws, lineNum, COL_WORK);
      drawCell({t: 'n', z: '0.0', v: work2hours(taskPlannedWork)}, ws, lineNum, COL_WORK_PLANNED);
      if (taskPlannedWork) {
        drawCell({t: 'n', z: '0.00', v: task.totalWork / taskPlannedWork}, ws, lineNum, COL_WORK_PLANNED_RATION);
      }
      // Draw work hours per employee
      employees.forEach((empl, emplInd) => {
        drawCell({t: 'n', z: '0.0', v: work2hours(task.employee2work[empl.id] || 0)}, ws, lineNum, employeeColStart + emplInd);
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
  drawCell({t: 'n', z: '0.0', v: work2hours(allProjWorkFromCard), s: totalLineStyle}, ws, lineNum, COL_WORK_FROM_CARD);
  drawCell({t: 'n', z: '0.0', v: work2hours(data.totalTotal), s: totalLineStyle}, ws, lineNum, COL_WORK);
  drawCell({t: 'n', z: '0.0', v: work2hours(allProjPlannedWork), s: totalLineStyle}, ws, lineNum, COL_WORK_PLANNED);
  if (allProjPlannedWork) {
    drawCell({t: 'n', z: '0.00', v: data.totalTotal / allProjPlannedWork, s: totalLineStyle}, ws,
      lineNum, COL_WORK_PLANNED_RATION);
  }
  else {
    drawCell({t: 's', v: '', s: totalLineStyle}, ws, lineNum, COL_WORK_PLANNED_RATION);
  }
  // Draw work hours per employee
  employees.forEach((empl, emplInd) => {
    drawCell({t: 'n', z: '0.0', v: work2hours(empl.totalWork || 0), s: totalLineStyle}, ws,
      lineNum, employeeColStart + emplInd);
  });

  // Finalize the document (finalize ws)
  const lastColIndex = cols.length - 1;
  var endOfWsRange = XLSX.utils.encode_cell({c: lastColIndex, r: lineNum});
  ws['!ref'] += endOfWsRange;

  // Write report to file
  XLSX.writeFile(wb, `${outdir}\\test.xlsx`);
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
