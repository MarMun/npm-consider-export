/**
 * @file export license information of packages to json file
 */

const fs = require('fs');
const inquirer = require('inquirer');
const colors = require('colors/safe');
const updateStatus = require('./updateStatus');
const detailsToJSON = require('./detailsToJSON');

/**
 * @param  {Object} packages
 */
module.exports = function exportDetails(packages) {
  try {
    inquirer
      .prompt([
        {
          type: 'input',
          name: 'fileName',
          message: 'File to export to (licenseDetails.json)'
        }
      ])
      .then(({ fileName }) => {
        fileName = fileName || 'licenseDetails.json';
        if (fileName.indexOf('.') === -1) {
          fileName += '.json';
        }
        updateStatus('Writing license details...');
        fs.writeFileSync(fileName, detailsToJSON(packages));
        updateStatus(`${colors.green(`License details written to ${fileName}`)}\n`);
      });
  } catch (err) {
    console.error(err);
  }
};
