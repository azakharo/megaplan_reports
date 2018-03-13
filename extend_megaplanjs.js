'use strict';

const megaplan = require('megaplanjs');


function extendMegaplanClient() {
  megaplan.Client.prototype.task_extra_fields = function (task_id) {
    return this.__request('::task/extFieldsMetadata.api', { id: task_id });
  };
  megaplan.Client.prototype.task_with_extra_fields = function (task_id, extra_fields) {
    const fldNames = extra_fields.map(f => f.name);
    return this.__request('::task/card.api', { id: task_id, extra_fields: fldNames });
  };
}


module.exports = {
  extendMegaplanClient
};
