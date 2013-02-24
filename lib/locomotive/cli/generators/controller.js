var _ = require('underscore')
	, fs = require('fs')
	, os = require('os')
	, mkdirp = require('mkdirp')
	, path = require('path');

var eol = 'win32' == os.platform() ? '\r\n' : '\n';

/**
 * Check if the given directory `path` is empty.
 *
 * @param {String} path
 * @param {Function} fn
 */
function emptyDirectory(path, fn) {
	fs.readdir(path, function(err, files){
		if (err && 'ENOENT' != err.code) throw err;
		fn(!files || !files.length);
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

var Controller = function (name, args) {
	var self = this;
	this.name = null;
	this.actions = [];
	this.views = [];
	this.controllerTemplate = [
		"var locomotive = require('locomotive')",
		"  , Controller = locomotive.Controller;",
		"",
		"var {#name}Controller = new Controller();",
		"",
		"{#name}Controller.main = function() {",
		"   this.title = '{#name}'",
		"   this.render();",
		"}",		,
		"{#actions}",
		"module.exports = {#name}Controller;"
	];
	this.actionBlockTemplate = [
		"{#name}Controller.{#action} = function() {",
		"   this.title = '{#name} {#action}';",
		"   this.render();",
		"}",
		""
	];
	this.writeRoutes = function (done) {
		var self = this;
		var currentDirectory = process.cwd();
		var routeString = "this.match('{#name}/{#action}', '{#name}#{#action}');";
		if(fs.existsSync(path.resolve(currentDirectory, 'config/'))) {
			fs.readFile(path.resolve(currentDirectory, 'config/routes.js'), 'utf8', function (err,data) {
				if (err) return done(err);
				var dataArray = data.split('\n');
				var closingBracketIndex = _.lastIndexOf(dataArray, '}');
				_.each(self.actions, function (_this) {
					var _routeString = routeString;
					_routeString = _routeString.replace(/\{#name\}/gi, self.name.toLowerCase());
					_routeString = _routeString.replace(/\{#action\}/gi, _this);
					dataArray.splice(closingBracketIndex, 0, '  ' + _routeString);
				});
				self.write(path.resolve(currentDirectory, 'config/routes.js'), dataArray.join(eol), true);
				return done();
			});
		} else {
			throw [
				'Must be in locomotive application root directory',
				''
			];
		}
	};
	/**
	 * replaces the controller template with action and name variables
	 *
	 * @param {Function} done(templateString)
	 */
	this.generateControllerTemplate = function (done) {
		var template = _.clone(this.controllerTemplate.join(eol));
		var actionTemplate = _.clone(this.actionBlockTemplate.join(eol));
		// Replace the {#name} variable in the template with capitalized name
		template = template.replace(/\{#name\}/gi, this.name.charAt(0).toUpperCase() + this.name.slice(1));
		if (!this.actions.length > 0) {
			template = template.replace(/\{#actions\}/gi, "");
		} else {
			var name = this.name;
			var output = '';
			_.each(this.actions, function (_this) {
				var tpl = _.clone(actionTemplate);
				tpl = tpl.replace(/\{#name\}/gi, name.charAt(0).toUpperCase() + name.slice(1));
				tpl = tpl.replace(/\{#action\}/gi, _this);
				output += tpl;
			});
			template = template.replace(/\{#actions\}/gi, output);
		}

		done(template);
	};
	/**
	 * echo str > path.
	 *
	 * @param {String} path
	 * @param {String} str
	 */
	this.write = function (path, str, isEdit) {
		fs.writeFile(path, str);
		if (!isEdit) return console.log('   \x1b[36mcreate\x1b[0m : ' + path);
		return console.log('   \x1b[36mediting\x1b[0m : ' + path);
	};
	// CONSTRUCTOR
	// =============
	if (!name) {
		throw [
			'',
			'  Usage:',
			'    lcm generate controller <NAME> [actions] [options]',
			'',
			'  Example:',
			'    lcm generate controller Books buy sell',
			'',
			'    Books controller with URLs like /books/sell',
			'',
			'      Controller:  app/controllers/books.js',
			'      Views:       app/views/books/sell.html.ejs, views/books/buy.html.ejs',
			''
		];

	} else {
		console.log([
			'',
			'Generating controller \'' + name + '\'',
			''
		].join(eol));
		this.name = name;
		this.actions = args;
		// Do the magic!
		this.generateControllerTemplate(function(tpl) {
			var currentDirectory = process.cwd();
			if(fs.existsSync(path.resolve(currentDirectory, 'app/'))) {
				self.write(path.resolve(currentDirectory, 'app/controllers/' + self.name.toLowerCase() + '_controller.js'), tpl);
				if (self.actions && self.actions.length  > 0) {
					mkdir(path.resolve(currentDirectory, 'app/views/' + self.name.toLowerCase()), function () {
						_.each(self.actions, function (action) {
							self.write(path.resolve(currentDirectory, 'app/views/' + self.name.toLowerCase() + '/' + action + '.html.ejs'), '');
						});
						self.writeRoutes(function () {

						});
					});
				}
			} else {
				throw [
					'Must be in locomotive application root directory',
					''
				];
			}
		});
	}
	// END CONSTRUCT
};

module.exports = function (args) {
	return new Controller(
		_.first(args)
		, _.rest(args)
	);
}
