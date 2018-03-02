'use strict';

const {concat, times, constant} = require('lodash');
const XLSX = require('xlsx');


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
  const employeeNames = data.employees.map(e => e.name);
  let colNames = ['Проект', 'Задача', 'Затраченное время из карточки', 'Затраченное время',
    'Запланированное время', 'Затраченное/запланированное время'];
  const employeeColStart = colNames.length;
  colNames = concat(colNames, employeeNames);
  const cols = times(colNames.length, constant({wch: 25}));

  // Create worksheet
  wb.SheetNames.push(SHEET_NAME);
  wb.Sheets[SHEET_NAME] = {
    '!ref': 'A1:',
    '!cols': cols
  };
  const ws = wb.Sheets[SHEET_NAME];

  // Draw the header
  colNames.forEach((col, colInd) => {
    const cell = {
      t: "s",
      v: col,
      s: {
        font: {
          bold: true
        }
      }
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
