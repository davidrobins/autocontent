"use strict";

const express = require('express')
const app = express();
const bodyParser = require('body-parser');
const config = require('./config');


const { getCategories, getCategoryId, getCategorySlug, createCategory } = require('./category');
const { getPostsFromCat, getPost, prepPost, sendPost } = require('./post');

app.use(bodyParser.json()); // support json encoded bodies

app.post('/', (req, res) => {

  /* 
    params:
    sourceapi (string),
    targetapi (string),
    count (int),
    [sectionslug] (string)
  */
  
  const { source, target, count, section, charles } = req.body;

  if(charles){
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    process.env.http_proxy = 'http://localhost:8888';
    process.env.https_proxy = 'http://localhost:8888';
  }

  if(section){
    
    let targetCats = getCategories(target);
    let sourceCats = getCategories(source);
    
    let postsArr = new Promise((resolve, reject) => {
      getCategoryId(source, section)
      .then(cat => { return getPostsFromCat(source, count, cat.id) })
      .then(posts => resolve(posts));
    });
      
    Promise.all([targetCats, sourceCats, postsArr])
    .then( ([targetCats, sourceCats, postsArr]) => {

      let sendPostPromises = [];
      
      postsArr.forEach(p => {

        getPost(source, p.id)
        .then(P => {

          P = prepPost(P);

          let newCatPromises = [], tCats = [];

          P.categories.forEach(cat => {
            let sCat = sourceCats.find(sC => { return(cat == sC.id) }) // must always succeed
            let tCat = targetCats.find(tC => { return(sCat.slug == tC.slug) }) // may fail if not present in target categories
            if(tCat){
              tCats.push(tCat.id)
            } else {
              newCatPromises.push(createCategory(sCat));
            }
          });

          Promise.all(newCatPromises)
          .then(newCats => {
            newCats.forEach(nC => tCats.push(nC.id));
            P.categories = tCats;
            sendPostPromises.push(sendPost(target, P));
          })

        })

      });

      Promise.all(sendPostPromises)
      .then(posts => {

        console.log(`sent ${posts.length} posts`);
        

        let successful = 0, failed = 0;
        posts.forEach(post => {
          
          if(post.statusCode == 201) {
            successful++;
          } else {
            failed++;
          } 
        });
        res.send(`${successful} posts were posted successfully; ${failed} posts failed`);
      });

    });
  }


});

app.listen(8001, () => {
  console.log('listening on port 8001')
});