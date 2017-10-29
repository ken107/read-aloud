var fs = require("fs"),
	util = require("util"),
	gulp = require("gulp"),
	newer = require("gulp-newer"),
	concat = require("gulp-concat"),
	uglify = require("gulp-uglify"),
	zip = require("gulp-zip");

gulp.task("remote-voice-list", async function() {
	var stats = await Promise.all([
		util.promisify(fs.stat)("manifest.json"),
		util.promisify(fs.stat)("build/remote_voices.js").catch(err => ({mtime: 0}))
	])
	if (stats[0].mtime > stats[1].mtime) {
		var manifest = JSON.parse(await util.promisify(fs.readFile)("manifest.json"));
		await util.promisify(fs.mkdir)("build").catch(err => "OK");
		await util.promisify(fs.writeFile)("build/remote_voices.js", "var remoteVoices = " + JSON.stringify(manifest.tts_engine.voices));
	}
})

gulp.task("embed-script", ["remote-voice-list"], function() {
  return gulp.src([
			"build/remote_voices.js",
			"js/defaults.js",
			"js/content.js",
			"js/speech.js",
			"js/googletr_tts.js",
			"js/embed.js"
		])
    .pipe(newer("docs/js/readaloud.min.js"))
    .pipe(concat("docs/js/readaloud.min.js"))
    .pipe(uglify({compress: {evaluate: false}}))
    .pipe(gulp.dest("."))
})

gulp.task("build", ["embed-script"]);

gulp.task("dist", function() {
	return gulp.src(["_locales/**", "css/**", "img/**", "js/**", "*.html", "manifest.json"], {base: "."})
		.pipe(zip("package.zip"))
		.pipe(gulp.dest("build"))
})

gulp.task("default", ["build"]);
