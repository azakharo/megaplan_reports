'use strict';

const {concat} = require('lodash');
const XLSX = require('xlsx');
const {getTimePeriodStr} = require('./utils');


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
    {title: 'Проект', width: 25},
    {title: `Задачи за ${getTimePeriodStr(dtStart, dtEnd)}`, width: 44},
    {title: 'Затрач. время из карточки', width: 23},
    {title: 'Затраченное время', width: 17},
    {title: 'Запланированное время', width: 21},
    {title: 'Затрач/запланир.', width: 15}
  ];
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
      v: col.title
    };

    const cellAddress = {c: colInd, r: lineNum};
    const cellRef = XLSX.utils.encode_cell(cellAddress);
    ws[cellRef] = cell;
  });
  lineNum += 1;

  // Finalize the document (finalize ws)
  const lastColIndex = cols.length - 1;
  var endOfWsRange = XLSX.utils.encode_cell({c: lastColIndex, r: lineNum});
  ws['!ref'] += endOfWsRange;

  // Write report to file
  XLSX.writeFile(wb, `${outdir}\\test.xlsx`);
};
