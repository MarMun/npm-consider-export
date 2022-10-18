/**
 * @file create json of license information of packages
 */

/**
 * @param  {Object} packages
 */
module.exports = function detailsToJSON(packages) {
  return JSON.stringify(packages, null, 4);
};
