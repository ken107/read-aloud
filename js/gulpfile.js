var gulp = require("gulp"),
	newer = require("gulp-newer"),
	concat = require("gulp-concat"),
	uglify = require("gulp-uglify")

gulp.task("default", function() {
  gulp.src(["content.js", "speech.js", "googletr_tts.js", "embed.js"])
    .pipe(newer("../docs/js/readaloud.min.js"))
    .pipe(concat("../docs/js/readaloud.min.js"))
    .pipe(uglify({compress: {evaluate: false}}))
    .pipe(gulp.dest("."))
})
