"use strict";

const config = require('./config');
const querystring = require('querystring');
const request = require('request');

function getReq(env, path, options = {}, accum = []){

  console.log('getReq env', env);  
  
  return new Promise((resolve, reject) => {
  
    const { count, page } = options;
    const { api } = config[env]
    
    if(options.count){
      options = Object.assign({ page: 1 }, options );
      options.per_page = options.count < 100 ? options.count : 100;
    }
  
    let optstr = '?';
    optstr += querystring.stringify(options);

    request(`${api}${path}${optstr}`, (err, res, body) => {

      body = JSON.parse(body);
      
      if(options.count){
        
        accum = accum.concat(body);

        if(accum.length >= options.count || body.length < options.per_page){
          resolve(accum);
        } else {
          getReq(env, path, Object.assign(options, {page: options.page + 1}), accum)
          .then(accum => resolve(accum));
        }

      } else {
        resolve(body);
      }
    });
      
  });
}

module.exports = getReq;