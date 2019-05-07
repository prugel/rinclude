'use strict';
const nodePath = require('path'),
  isUndefined = require('lodash.isundefined'),
  includes = require('lodash.includes'),
  fs = require('fs-extended'),
  callsite = require('callsite'),
  colors = require('colors'),
  // dot = require('dot-object'),
  isString = require('lodash.isstring'),
  forEach = require('lodash.foreach'),

  generateIndexJs = require('./api/generateIndexJs'),
  getProperty = require('./api/getProperty'),
  getList = require('./api/getList');

let scanResult = {},     // lib list : absolute path
  libs = [],     // keys of scanResult
  folders = [],     // scanned folder
  loadedPath = {},    // loaded lib with absolute path
  loaded = {},    // loaded lib
  root;


function include(lib) {
  const path = scanResult[lib];

  if (isUndefined(path)) {
    // absolute directory of caller
    const stack = callsite(),
      requester = stack[1].getFileName();
    const callerPath = nodePath.dirname(requester);

    console.log('[rinclude] '.yellow + lib.green + ' module not found in path [ ' + folders.join(', ').green + ' ]');
    console.log('[rinclude] '.yellow + 'in ' + requester.green);
    throw new Error('[' + lib + '] module not found in path [ ' + folders.join(', ') + ' ]');
  }

  return loaded[lib] ? loaded[lib] : loadRequire(loadedPath, lib);
}

function getCallerDirectory() {
}

include.path = function path(folder, prefix) {

  // absolute directory of caller
  const stack = callsite(),
    requester = stack[1].getFileName();
  root = nodePath.dirname(requester);

  // add folder
  folders.push(folder);

  // start scan
  this.scan(root, folder, prefix);

  return this;
};

include.scan = function scan(root, folder, prefix) {
  // console.log('loaded', loaded);

  const base = nodePath.resolve(root, folder);
  const newLibs = getList(base, false);
  // const newLibs = getList(base, true);

  // console.log('newLibs', newLibs);

  this.checkDuplicate(libs, newLibs, base, prefix);
  this.generate(newLibs, base, prefix);

  // getList(base, true);
  // console.log('scanResult', scanResult);
  // console.log('loaded', loaded);
};

include.checkDuplicate = function checkDuplicate(prevLibs, newLibs, base, prefix) {
  newLibs.forEach(function (lib) {
    const key = (prefix !== undefined) ? prefix + '.' + lib : lib;
    if (includes(prevLibs, key)) {
      console.log('[rinclude] '.yellow + key.green + ' module is duplicated. check it.');
      console.log('[rinclude] '.yellow + 'in directory ' + folders.join(', ').green);
      console.log('[rinclude] '.yellow + 'rename or use prefix.');
      throw new Error('[' + key + '] module is duplicated. check it.');
    }
  });
  libs = prevLibs.concat(newLibs);
};

include.generate = function generate(newLibs, base, prefix) {
  // const self = this;
  newLibs.forEach((lib) => {
    const name = nodePath.basename(lib, '.js');
    const key = (prefix !== undefined) ? prefix + '.' + name : name;
    const itemPath = scanResult[key] = nodePath.resolve(base, lib);

    // console.log(itemPath);
    loadedPath[key] = {};
    const check = getProperty(itemPath, 'index.js');
    if (getProperty(itemPath)) {
      // .generateIndex가 있는가?
      const targets = fs.readFileSync(itemPath + '/.generateIndex').toString().split(',');
      const files = generateIndexJs(itemPath, targets);
      // console.log('files', files);
      load(files, loadedPath, key, itemPath);
    } else if (getProperty(itemPath, 'index.js')) {
      // index.js가 있는가?
      loadedPath[key] = itemPath;
    } else {
      // 일반 파일.js만 있는가?
    }
    // console.log('chekc', check);
  });
};

function load(files, loaded, app, itemPath) {
  forEach(files, (file, key) => {
    const name = nodePath.basename(key, '.js');
    // console.log('name', name);

    if (!isString(file)) {
      // console.log('!isString, file', file);
      load(file, loaded[app], name, itemPath);
    } else {
      // console.log('file', file, nodePath.join(itemPath, file));
      // console.log('set', loaded, app, name);
      loaded[app] = loaded[app] || {};
      loaded[app][name] = nodePath.join(itemPath, file);
      // console.log('loaded', loaded)
    }

  })
}

function loadRequire(loadedPath, lib) {
  let loading = {};

  const traverse = (obj, loading) => {
    for (let k in obj) {
      if (obj[k] && typeof obj[k] === 'object') {
        loading[k] = {};
        traverse(obj[k], loading[k])
      } else {
        // Do something with obj[k]
        loading[k] = require(obj[k]);
      }
    }
  }

  traverse(loadedPath[lib], loading);
  // console.log(loading)
  loaded[lib] = loading;
  return loading;
}

module.exports = include
