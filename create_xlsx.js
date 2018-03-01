'use strict';

const XLSX = require('xlsx');


module.exports = function createXlsx(data, dtStart, dtEnd, outdir) {
  const wb = XLSX.utils.book_new();

  wb.Props = {
    Title: "Квартальный отчёт",
    Subject: "Стоимость работ / затраченное время, ресурсы",
    Author: "Алексей Захаров",
    CreatedDate: new Date()
  };

  wb.SheetNames.push("Лист 1");

  const ws_data = [['hello', 'world']];  //a row with 2 columns

  const ws = XLSX.utils.aoa_to_sheet(ws_data);

  wb.Sheets["Лист 1"] = ws;

  XLSX.writeFile(wb, `${outdir}\\test.xlsx`);
};
