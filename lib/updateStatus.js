/**
 * @file write/update process status
 */

const program = require('commander');
const readline = require('readline');

/**
 * @param  {String} messages
 */
module.exports = function updateStatus(message) {
  const [, options] = program.args;
  if (options.pipe) { return; }

  readline.cursorTo(process.stdout, 0);
  readline.clearLine(process.stdout, 1);
  process.stdout.write(message);
};

