"use strict";

const express = require('express')
const app = express();
const request = require('request');
const querystring = require('querystring');
const bodyParser = require('body-parser');
const crypto  = require('crypto');
const Oauth = require('oauth-1.0a');
const fs = require('fs');

const config = {
  dev: {
    api: 'http://helios-cache.development.apps.poc-cluster.ngn-dev.ntch.co.uk/www-dev.uat-thescottishsun.co.uk/wp-json',
    namespace: 'thescottishsun',
    oauthUrl: 'https://www-dev.uat-thesun.co.uk/wp-json',
    clientKey: 'TRrJxAlRtoON',
    clientSecret: '1fEOgJIPOPXV2crtm5Djw4OMeOadWP57Ox0J0jwTwZcW3ErR',
    accessToken: 'XD0ubal7i33SfbsYKnoteGm4',
    accessTokenSecret: 'FMLLIbgrQMe349gK1tAxookLMBH3kxziO0PnTjdS8om7nA8j',
  },
  prod: {
    api: 'http://helios-production-api-cache.miki4tesma.eu-west-1.elasticbeanstalk.com/wp-json',
    namespace: 'thesun',
  }
};

function getCategories(api){
  return new Promise((resolve, reject ) => {
    getRequest(api, '/wp/v2/categories', { count: 180, page: 1 })
    .then(cats => { 
      console.log(`getCategories fetched ${cats.length} cats`);
      resolve(cats)
    })
  });
}

function getCategoryId(api, slug){
  return new Promise((resolve, reject) => {
    getCategories(api)
    .then(cats => {
      console.log('getCategoryId got cats', cats.length);
      cats.map(cat => { if (cat.slug === slug) resolve(cat) });
    });
  });
}

function getCategorySlug(api, id){
  return new Promise((resolve, reject) => {
    getCategories(api)
    .then(cats => cats.map(cat => {
      if (cat.id === id) resolve(cat);
    }));
  });
}

function getPostsFromCat(api, namespace, count, catid){
  return new Promise((resolve, reject ) => {
    getRequest(api, `/${namespace}/v1/posts/lite`, { categories: catid, count: count })
    .then(posts => { resolve(posts) } )
  });
}

function getPost(api, postid){
  return new Promise((resolve, reject) => {
    getRequest(api, `/wp/v2/posts/${postid}`)
    .then(post => { resolve(post[0]) })
  });
}

function createCategory(api, catObj){
  return new Promise((resolve, reject) => {

    let requestData = {
      url: `${api}/wp/v2/categories`,
      method: 'POST',
      data: catObj,
    }

    const reqOptions = {
      url: requestData.url,
      method: requestData.method,
      data: requestData.data,
      headers: oauth.toHeader(oauth.authorize(requestData, oauthToken))
    }

    request(reqOptions, (err, res, body) => {
      if(err) console.log(err)
      if(res.statusCode == 201) resolve(body.id);
      if(res.statusCode == 500 && body.code == 'term_exists') resolve(body.data);
    });

  })

}

function sendPost(api, postObj, auth = {}){

  let requestData = {
    url: `${api}/wp/v2/posts`,
    method: 'POST',
    data: postObj,
  }

  const reqOptions = {
    url: requestData.url,
    method: requestData.method,
    data: requestData.data,
    headers: oauth.toHeader(oauth.authorize(requestData, oauthToken))
  }

  request(reqOptions, (err, res, body) => {
    if(err) console.log(err)
    if(res.statusCode == 200) { console.log(`Post ${postObj.title} was successfully sent`) } else { console.log(`Oops, that didn\'t go to plan... ${postObj.title} upload failed`) };
  });
  
}

function getRequestPromise(api, path, options = {}){
  return new Promise((resolve, reject) => {
    resolve( getRequest(api, path, options) );
  });
}

function getRequest(api, path, options = {}, accum = []){

  console.log(`requesting path ${api}${path}`);
  console.log('request options', options);

  const { count, page } = options;
  
  if(options.count){
    options = Object.assign({ page: 1 }, options );
    options.per_page = options.count < 100 ? options.count : 100;
    // delete options.count
  }

  let optstr = '?';
  optstr += querystring.stringify(options);
  
  request(`${api}${path}${optstr}`, (err, res, body) => {
    if(err) console.log(err);
    body = JSON.parse(body);
    accum = accum.concat(body);
    if(accum.length < count && body.length == options.per_page){
      console.log('recursing for more data');
      return getRequest(api, path, Object.assign(options, {page: page + 1}), accum);
    } else {
      console.log(`resolving with ${accum.length} items`);
      return accum;
    }
  });

}

app.use(bodyParser.json()); // support json encoded bodies

app.post('/source/cats', (req, res) => {

  let { source, target, count, section } = req.body;
  target = config[req.body.target]; // dev
  source = config[req.body.source]; // prod

  return getRequestPromise(source.api, '/wp/v2/categories', {count: 90, page: 1})
  .then(cats => {
    console.log('bob', cats);
    res.send(`fetched some categories`)
  });

});

app.post('/source/catid', (req, res) => {

  let { source, target, count, section } = req.body;
  target = config[req.body.target]; // dev
  source = config[req.body.source]; // prod

  getCategoryId(source.api, section).then(catid => { res.send(`fetched category id ${catid}`) });

});

app.post('/', (req, res) => {

  /* 
    params:
    sourceapi (string),
    targetapi (string),
    count (int),
    [sectionslug] (string)
  */
  
  let { source, target, count, section } = req.body;

  target = config[req.body.target]; // dev
  source = config[req.body.source]; // prod


  const oauth = Oauth({
    baseUrl: target.api,
    consumer: {
      key: target.clientKey,
      secret: target.clientSecret,
    },
    signature_method: 'HMAC-SHA1',
    hash_function: (baseString, key) => crypto.createHmac('sha1', key).update(baseString).digest('base64'),
  });
  
  const oauthToken = {		
    key: target.accessToken,		
    secret: target.accessTokenSecret,		
  };

  if(section){
    
    let targetCats = getCategories(target.api);
    let sourceCats = getCategories(source.api);
 
    let postsArr = new Promise((resolve, reject) => {
      getCategoryId(source.api, section)
      .then(cat => { getPostsFromCat(source.api, source.namespace, count, cat.id) })
      .then(posts => resolve(posts));
    });
      
    Promise.all([targetCats, sourceCats, postsArr])
    .then( ([targetCats, sourceCats, postsArr]) => {

      console.log(`Successfully fetched ${sourceCats.length} cats`);
      
      postsArr.forEach(p => {

        console.log('going to fetch full object for ', p.id, 'from ', source.api);

        getPost(source.api, p.id)
        .then(P => {

          let newCatPromises = [], tCats = [];

          console.log('P categories:', P.categories);

          P.categories.forEach(cat => {
            console.log('P category is:', cat);
            let sCat = sourceCats.find(sC => { return(cat == sC.id) }) // must always succeed
            console.log(`${P.title} sCat:`, sCat);
            let tCat = targetCats.find(tC => { return(sCat.slug == tC.slug) }) // may fail if not present in target categories
            console.log('tCat:', tCat);
            if(tCat){
              tCats.push(tCat)
            } else {
              newCatPromises.push(createCategory(sCat));
            }
          });

          Promise.all(newCatPromises)
          .then(newCats => {
            newCats.forEach(nC => tCats.push(nC.id));

            P.categories = tCats;
            // sendPost(target.api, P);
            console.log(P.title);
          })

        })

      })
    })
  }


});

app.listen(8001, () => {
  console.log('listening on port 8001')
});


/*
sync categories between instances?
get n articles for a section
for each, get a full post for post id
push into target api
*/

/*

full post has array of category ids
get the category slugs from sourceCats
get the category items from targetCats using slug
get the cat ids from each category item

if category doesn't exist in target cats, make it and push to target api

sending a create category request to the API for a cat that already exists, returns the existing category id.

*/