/**
 * Created by Vincent on 04/11/2015.
 */
var i18n = require('i18n');

i18n.configure({
  // setup some locales - other locales default to en silently
  locales:['fr', 'en'],
  // where to store json files - defaults to './locales' relative to modules directory
  directory: __dirname + '/locales',
  defaultLocale: 'fr',
  // sets a custom cookie name to parse locale settings from  - defaults to NULL
  cookie: 'lang',
  objectNotation: true
});

module.exports = function(req, res, next) {
  i18n.init(req, res);
 // res.locale('__', res.__);
  //var current_locale = i18n.getLocale();
  return next();
};