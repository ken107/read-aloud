var fs = require("fs"),
	util = require("util"),
	path = require("path"),
	{minify} = require("uglify-js");

const fsp = {
	readFile: util.promisify(fs.readFile),
	writeFile: util.promisify(fs.writeFile),
	stat: util.promisify(fs.stat)
};


exports.build = async function() {
	const jsFiles = ["manifest.json", "js/defaults.js", "js/content.js", "js/speech.js", "js/embed.js"];
	const outFile = "docs/js/readaloud.js";
	const outFileMin = "docs/js/readaloud.min.js";

	const areNewer = await Promise.all(jsFiles.map(file => isNewer(file, outFile)));
	if (!areNewer.some(x => x)) {
		console.log("No changes");
		return;
	}

	const str = fs.createWriteStream(outFile);
	str.write("var readAloudManifest = ");
	for (const file of jsFiles) await copyStream(fs.createReadStream(file), str);
	str.end();

	const {error, code} = minify(outFile);
	if (error) {
		console.log(error);
		return;
	}
	await fsp.writeFile(outFileMin, code);
}


async function isNewer(srcFile, dstFile) {
	const srcStat = await fsp.stat(srcFile);
	try {
		const dstStat = await fsp.stat(dstFile);
		return srcStat.mtime > dstStat.mtime;
	}
	catch (err) {
		return true;
	}
}

function copyStream(src, dst) {
	return new Promise(function(fulfill, reject) {
		src.pipe(dst, {end: false});
		src.on("error", reject);
		src.on("end", fulfill);
	})
}

if (require.main == module) {
	const task = process.argv[2];
	if (task) exports[task]();
	else console.error("No task specified");
}
