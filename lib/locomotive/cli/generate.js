/**
 * Module dependencies.
 */
var program = require('commander')
	, path = require('path')
	, _ = require('underscore')
	, os = require('os')
	, fs = require('fs')
	, util = require('util')
	, mkdirp = require('mkdirp');

var eol = 'win32' == os.platform() ? '\r\n' : '\n';

/**
 * Create Locomotive component.
 *
 * @param {String} generator
 * @param {Array} args
 * @api private
 */
exports = module.exports = function generate(generatorName, args) {
	generator_exists(generatorName, function (exists, nativePath, modulePath) {
		if (exists) {
			if (nativePath) {
				try {
					var Generator = require(nativePath)(args);
				} catch (e) {
					console.log(e.join(eol));
				}
			} else {

			}
		} else {
			console.log([
				'',
				'   \033[31mUnknown generator ' + generatorName + '\033[0m',
				'',
				'  Usage:',
				'    lcm generate <generator> <args> [options]',
				''
			].join(eol));
		}
	});
}

/**
 * Mkdir -p.
 *
 * @param {String} path
 * @param {Function} fn
 */
function mkdir(path, fn) {
	mkdirp(path, 0755, function(err){
		if (err) throw err;
		console.log('   \033[36mcreate\033[0m : ' + path);
		fn && fn();
	});
}

/**
 * echo str > path.
 *
 * @param {String} path
 * @param {String} str
 */
function write(path, str) {
	fs.writeFile(path, str);
	console.log('   \x1b[36mcreate\x1b[0m : ' + path);
}

/**
 * Exit with the given `str`.
 *
 * @param {String} str
 */
function abort(str) {
	console.error('\033[31m' + str + '\033[0m\nUse lcm --help for available commands and usage.');
	process.exit(1);
}

/**
 * Check if given ´str´ exists as a generator (node module or native)
 *
 * @param {String} str
 * @param {Function} done(exists, isNative, isModule)
 */
generator_exists = function (name, done) {
	var modulePath,
		nativePath = path.resolve(__dirname, 'generators/' + name + '.js');
	// Check if it's a node_module at first...
	try {
		modulePath = require.resolve( 'locomotive-generator-' + name );
	}
	catch (e) {
		modulePath = null;
	}
	// Check if its a native generator and if it exists
	if(!fs.existsSync(nativePath)) nativePath = null;

	return (modulePath || nativePath) ? done(true, nativePath, modulePath) : done(false);
};