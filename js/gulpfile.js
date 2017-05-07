var fs = require("fs");
var gulp = require("gulp"),
	newer = require("gulp-newer"),
	concat = require("gulp-concat"),
	uglify = require("gulp-uglify")

gulp.task("default", function() {
  var manifest = JSON.parse(fs.readFileSync("../manifest.json"));
  fs.writeFileSync("remotevoices.js", "var remoteVoices = " + JSON.stringify(manifest.tts_engine.voices));

  gulp.src(["remotevoices.js", "content.js", "speech.js", "googletr_tts.js", "embed.js"])
    .pipe(newer("../docs/js/readaloud.min.js"))
    .pipe(concat("../docs/js/readaloud.min.js"))
    .pipe(uglify({compress: {evaluate: false}}))
    .pipe(gulp.dest("."))
    .on("end", () => {
      fs.unlinkSync("remotevoices.js");
    })
})
