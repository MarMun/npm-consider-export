/**
 * @file install action
 */
const getLocalPackage = require('./getLocalPackage');
const colors = require('colors/safe');
const walkDependencies = require('./walkDependencies');
const getInstallCommand = require('./getInstallCommand');
const inquirer = require('inquirer');
const exec = require('./exec');
const showDetails = require('./showDetails');
const exportDetails = require('./exportDetails');
const isProduction = require('./isProduction');
const getPackagesStats = require('./getPackagesStats');
const formatLicenseType = require('./formatLicenseType');
const filesize = require('filesize');
const getSimpleTable = require('./getSimpleTable');
const program = require('commander');
const readline = require('readline');
const printError = require('./printError');
const detailsToJSON = require('./detailsToJSON');

/**
 * indicates if any limits of test config are not satisfied
 * @type {Boolean}
 */
let testFailed = false;

/**
 * @return {Promise}
 */
function promptAction(packages) {
  return getInstallCommand().then(({ command, args }) => {
    const choices = [
      `Install (${
        colors.bold(`${
          command
        }${
          args.length ? ' ' : ''
        }${
          args.join(` `)
        }`)
      })`,
      `Details (Show)`,
      `Details (Export to JSON)`,
      `Skip`
    ];
    return inquirer.prompt({
      type: `list`,
      name: `next`,
      message: `What is next?`,
      choices
    }).then(({ next }) => {
      switch (choices.indexOf(next)) {
        case 0:
          exec(command, args);
          return Promise.reject();
        case 1:
          return showDetails(packages);
        case 2:
          return exportDetails(packages);
        default:
          process.exit(0);
      }
    }).catch((e) => {
      if (e) {
        throw e;
      }
    });
  });
}

/**
 * @param  {object} localPackage package.json
 * @return {object} test config
 */
function getTestConfig(localPackage) {
  const config = localPackage.config || {};
  return config;
}

/**
 * @param  {number} current
 * @param  {number} max
 * @param  {function} [formatter=String]
 * @return {string}
 */
function getLimitResult(current, max, formatter = String) {
  if (!max) {
    return '';
  }
  if (current < max) {
    return colors.green(`<= ${formatter(max)}`);
  }
  testFailed = true;
  return colors.red(`>  ${formatter(max)}`);
}

/**
 * @param  {string[]} allowedLicenseTypes
 * @param  {string} type
 * @return {string}
 */
function checkLicenseType(allowedLicenseTypes, type) {
  if (allowedLicenseTypes && allowedLicenseTypes.length) {
    if (allowedLicenseTypes.includes(type)) {
      return colors.green('✓');
    }
    testFailed = true;
    return colors.red('x');
  }
  return '';
}


/**
 * print package stats with relation to test limits
 * @param  {object} testConfig
 * @param  {number} testConfig.maxSizeBites
 * @param  {number} testConfig.maxPackagesNumber
 * @param  {string[]} testConfig.allowedLicenseTypes
 * @param  {object} packages
 */
function showPackageStats(
  {
    maxSizeBites,
    maxPackagesNumber,
    allowedLicenseTypes
  }, packages
) {
  const { count, size, licenseTypes } = getPackagesStats(packages);
  readline.cursorTo(process.stdout, 0);
  readline.clearLine(process.stdout);
  const table = getSimpleTable();
  table.push(
    ['Packages', count, '', getLimitResult(
      count, maxPackagesNumber
    )],
    ['Size', filesize(size), '', getLimitResult(size, maxSizeBites, filesize)]
  );
  Object.keys(licenseTypes).forEach((type, k) => {
    table.push(
      [
        k === 0 ? 'Licenses' : '',
        formatLicenseType(type),
        licenseTypes[type],
        checkLicenseType(allowedLicenseTypes, type)
      ]
    );
  });
  console.log(table.toString());
}

module.exports = function install() {
  getLocalPackage()
    .then((localPackage) => {
      const {
        name, version, dependencies, devDependencies
      } = localPackage;

      const [, options] = program.args;
      const allDependencies = {};

      if (!options.pipe) {
        console.log(colors.bold(
          `${name}@${version}`
        ));
      }

      // TODO: dev and prod may have different versions of same dependency

      Object.assign(
        allDependencies,
        dependencies || {}
      );

      if (!isProduction()) {
        Object.assign(
          allDependencies,
          devDependencies || {}
        );
      }

      return walkDependencies(
        allDependencies
      ).then((packages) => {
        if (!options.pipe) {
          showPackageStats(
            getTestConfig(localPackage), packages
          );
        }

        if (options.test) {
          // TODO: verify that test config is ok
          if (testFailed) {
            printError(`Limits provided in package.json are not satisfied`);
            process.exit(1);
          }
          return;
        }

        if (options.pipe) {
          console.log(detailsToJSON(packages));
          process.exit(0);
        }

        return promptAction(packages);
      });
    })
    .catch((e) => {
      printError(e);
      process.exit(1);
    });
};
