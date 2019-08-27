// include plug-ins
const gulp = require('gulp');
const chalk = require('chalk');
const del = require('del');
const zip = require('gulp-zip');
const rename = require('gulp-rename');
const log = require('fancy-log');
const chrome_manifest = require('./src/manifest.json');
const edge_manifest = require('./src/ms-manifest.json');
const source = ['src/**/*.*', '!src/ms-manifest.json', '!src/packages.config', '!src/images/original.svg', '!src/scripts/edge-bridge/**'];

const chrome = {
    src: source,
    version: chrome_manifest.version
};

const edge = {
    src: source.concat(['!src/manifest.json']),
    version: edge_manifest.version
};

function packageChrome() {
    console.log(chalk.yellow("Did you update the version in the manifest.json file for Chrome/Firefox? Current version is " + chrome.version));
    return gulp.src(chrome.src)
        .pipe(zip('chrome_firefox-package-' + chrome.version + '.zip'))
        .pipe(gulp.dest('dist/packages/'));
}

// copy to dist directory
function packageEdge() {
    console.log(chalk.yellow("Did you update the version in the ms-manifest.json file for Edge? Current version is " + edge.version));
    return gulp.src('dist/edge_sideload/**/*.*')
        .pipe(zip('edge-package-' + edge.version + '.zip'))
        .pipe(gulp.dest('dist/packages'));
}

// copy and rename ms-manifest.json -> manifest.json (Edge)
function renameManifest() {
    return gulp.src('src/ms-manifest.json')
        .pipe(rename('dist/edge_sideload/manifest.json'))
        .pipe(gulp.dest('.'));
}

// copy files needed for Edge API bridge
function copyEdgeResources() {
    return gulp.src('src/scripts/edge-bridge/**')
        .pipe(gulp.dest('dist/edge_sideload/'));
}

// copy files for edge
function copyFiles() {
    return gulp.src(edge.src)
        .pipe(gulp.dest('dist/edge_sideload/'));
}

// delete the dist folder
function clean() {
    return del(['dist/**', 'chrome-store/**'], { force: true });
}


// EXPORTS 
exports.default = gulp.series(clean, packageChrome, copyFiles, renameManifest, copyEdgeResources, packageEdge);
exports.createPackages = exports.default;
exports.clean = clean;