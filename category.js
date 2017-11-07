"use strict";

const config = require('./config');
const oauthRequest = require('./oauthrequest');
const getReq = require('./getreq');
const request = require('request');
const throttledRequest = require('throttled-request')(request);

throttledRequest.configure({
  requests: 1,
  milliseconds: 1000
});


function getCategories(env) {

  const { api } = config[env];

  return new Promise((resolve, reject) => {
    getReq(env, '/wp/v2/categories', { count: 180, page: 1 })
      .then(cats => {
        console.log(`getCategories fetched ${cats.length} cats from ${env}`);
        resolve(cats);
      })
  });
}

function getCategoryId(env, slug) {
  
  return new Promise((resolve, reject) => {
    getCategories(env)
      .then(cats => {
        cats.map(cat => {
          if (cat.slug === slug) {
            console.log(`getCategoryId got catid ${cat.id} for slug '${cat.slug}' from api ${env}`);
            resolve(cat)
          }
        });
      });
  });
}

function getCategorySlug(env, id) {
  
  return new Promise((resolve, reject) => {
    getCategories(env)
      .then(cats => cats.map(cat => {
        if (cat.id === id) {
          console.log(`getCategorySlug got slug ${cat.slug} for slug '${cat.id}' from api ${env}`);
          resolve(cat);
        }
      }));
  });
}

function createCategory(env, payload) {

  return new Promise((resolve, reject) => {

    const reqOptions = oauthRequest(env, '/wp/v2/categories', payload); // 'scotdev', uri, postObj

    payload.parent = 0;
    delete payload.meta.section_colour;

    throttledRequest(reqOptions, (err, res, body) => {
      if (err) console.log(err);
      console.log(`creating category "${payload.slug}", statusCode ${res.statusCode}`);
      resolve(res.statusCode);
    });

  });

}

module.exports = {
  getCategories,
  getCategoryId,
  getCategorySlug,
  createCategory
};