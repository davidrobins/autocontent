"use strict";

const config = require('./config');
const getReq = require('./getreq');
const oauthRequest = require('./oauthrequest');
const request = require('request');
const { getCategories, getCategoryId, getCategorySlug, createCategory } = require('./category');




function getPostsFromCat(env, count, catid){

  const { api, namespace } = config[env];

  return new Promise((resolve, reject ) => {
    getReq(env, `/${namespace}/v1/posts/lite`, { categories: catid, count: count })
    .then(posts => { 
      console.log(`getPostsFromCat got ${posts.length} posts for catid ${catid} from api ${api}`);      
      resolve(posts);
    } )
  });
}

function getPost(env, postid){

  const { api } = config[env];

  return new Promise((resolve, reject) => {
    getReq(env, `/wp/v2/posts/${postid}`)
    .then(post => {
      resolve(post)
    })
  });
}

function prepPost(postObj){
  
  const allowed = [ 'title','content','excerpt','date','date_gmt','slug','status','password','author','featured_media','comment_status','ping_status','format','meta','sticky','template','categories','tags','liveblog_likes'];

  let preppedPost = {};

  allowed.forEach(key => {
    if (postObj[key]) preppedPost[key] = postObj[key];
  });

  preppedPost.title = postObj.title.rendered;
  preppedPost.excerpt = postObj.excerpt.raw;
  preppedPost.content = postObj.content.raw;
  preppedPost.meta.sub_headline = postObj.meta.sub_headline.raw;
  preppedPost.meta.autocontent = 'true'; // this needs to registered with the api
  
  return preppedPost;

}

function sendPost(env, payload){
  
  return new Promise((resolve, reject) => {

    const reqOptions = oauthRequest(env, '/wp/v2/posts', payload); // 'scotdev', uri, postObj

    request(reqOptions, (err, res, body) => {
      if(err) console.log(err);
      resolve({res, body});
    });
  
  });

}

function buildPostPromises(source, target, sourceCats, targetCats, postsArr) {
  
    let sendPostPromises = [];
  
    // will resolve with an array of promises to send a post to the target api
    return new Promise((resolve, reject) => {
  
      postsArr.forEach(p => {
  
        // fetch the rich post object and map the categories to the target api
        getPost(source, p.id)
          .then(P => {
  
            P = prepPost(P);
  
            let newCatPromises = [], tCats = [];
  
            P.categories.forEach(cat => {
              let sCat = sourceCats.find(sC => { return (cat == sC.id) }) // must always succeed
              let tCat = targetCats.find(tC => { return (sCat.slug == tC.slug) }) // may fail if not present in target categories
              if (tCat) {
                tCats.push(tCat.id)
              } else {
                newCatPromises.push(createCategory(target, sCat));
              }
            });
  
            Promise.all(newCatPromises)
              .then(newCats => {
                newCats.forEach(nC => tCats.push(nC.id));
                P.categories = tCats;

                sendPostPromises.push(sendPost(target, P));
                if(sendPostPromises.length == postsArr.length) resolve(sendPostPromises);
              })
  
          })
  
      });
  
    });
  
  
  }

module.exports = {
  getPostsFromCat,
  getPost,
  prepPost,
  sendPost,
  buildPostPromises
}