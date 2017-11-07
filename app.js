"use strict";

const express = require('express')
const app = express();
const bodyParser = require('body-parser');
const config = require('./config');
const fs = require('fs');


const { getCategories, getCategoryId, getCategorySlug, createCategory } = require('./category');
const { getPostsFromCat, getPost, prepPost, sendPost, buildPostPromises } = require('./post');



app.use(bodyParser.json()); // support json encoded bodies

app.post('/', (req, res) => {

  console.log(req.body);

  const { source, target, count, offset = 0, section, charles } = req.body;

  if(!source || !target || !count || !section){
    res.send('Some required params missing');
  }

  // add proxying through charles
  if (charles) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    process.env.http_proxy = 'http://localhost:8888';
    process.env.https_proxy = 'http://localhost:8888';
  }

  // promises for source categories, target categories and lite array of posts from the required section
  let sourceCats = getCategories(source);
  let targetCats = getCategories(target);

  let postsArr = new Promise((resolve, reject) => {
    getCategoryId(source, section)
      .then(cat => { return getPostsFromCat(source, count, offset, cat.id) })
      .then(posts => resolve(posts));
  });

  Promise.all([sourceCats, targetCats, postsArr])
    .then(([sourceCats, targetCats, postsArr]) => {

      // fetch an array of promises to send a post to the target api
      buildPostPromises(source, target, sourceCats, targetCats, postsArr)
      .then(sendPostPromises => {

        // all the posts have been sent, send an outcome response
        Promise.all(sendPostPromises)
        .then(posts => {
          let completed = [];
          posts.forEach(post => {
            if (post.res.statusCode == 201) {
              completed.push(`/${section}/${post.body.id}/${post.body.slug}`);
            }
          });
          fs.writeFile(`${section}_${new Date().getUTCMilliseconds()}.json`, JSON.stringify(completed));
          console.log(`${completed.length} posts sent`);
          res.send(`${completed.length} posts sent`);
        });

      })
      
    });

});

app.listen(8001, () => {
  console.log('listening on port 8001')
});