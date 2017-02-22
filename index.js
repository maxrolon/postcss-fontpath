'use strict';

var fs = require('fs');
var objectAssign = require('object-assign');
var path = require('path');
var postcss = require('postcss');
var url = require('url');

module.exports = postcss.plugin('postcss-fontpath', function (opts) {
  console.dir( opts )

  opts = objectAssign({
    checkPath: false,
    shopifyCDNPath: '',
  }, opts);

  return function (css, result) {
    // Loop through each @rule
    css.walkAtRules('font-face', function(rule) {

      // Loop through each decleration in the rule
      rule.walkDecls('font-path', function(decl) {

        let url = decl.value.replace(/"/g, '')

        const isShopify = /^{{.*}}$/.test( url )

        const isProd = process.env.NODE_ENV === 'production'

        const addPrefix = ( str, ext ) => {
          if ( isShopify ) {
            let mutated
            if ( isProd ) {
              mutated = str.replace(/(\{\{ ?'.[^']*)/,  '$1' + ext )
            } else {
              mutated = opts.shopifyCDNPath + str.match(/\{\{ ?'(.[^']*)/)[1] + ext
            }
            return mutated
          } else {
            return `${str}.${ext}`
          }
        }

        // Gather up the components of our new declerations
        var fontPath = decl.value.replace(/"/g, ''),
            src = '',
            ieSrc = 'url("' + addPrefix( url, 'eot' ) + '")',
            formats = [
              { type: 'embedded-opentype', ext: '.eot?#iefix' },
              { type: 'woff', ext: '.woff' },
              { type: 'truetype', ext: '.ttf' },
              { type: 'svg', ext: '.svg' }
            ];

        // Construct the new src value
        formats.forEach(function(format, index, array) {

          if (opts.checkPath === true) {

            // Make the fontPath absolute and normalize it (removes the #iefix hash)
            var absoluteFontPath = url.parse(path.resolve(path.dirname(css.source.input.file), fontPath) + format.ext).pathname;

            try {
              fs.accessSync(absoluteFontPath, fs.F_OK);
            } catch (err) {
              decl.warn(result, 'Cannot find file "' + fontPath + format.ext + '"');

              // Skip the format in the src output
              return;
            }
          }

          if (index === array.length - 1){
            src += 'url("' + addPrefix( url, format.ext ) + '") format(\'' + format.type + '\')';
          } else {
            src += 'url("' + addPrefix( url, format.ext ) + '") format(\'' + format.type + '\'),\n       ';
          }

        });

        if (src.length > 0) {

          // IE Fix src prop
          decl.cloneBefore({ prop: 'src', value: ieSrc });

          // New src prop
          decl.cloneBefore({ prop: 'src', value: src });
        }

        // Remove our custom decleration
        decl.remove();

      });

    });

  };
});
