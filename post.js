"use strict";

const config = require('./config');
const getReq = require('./getreq');
const oauthRequest = require('./oauthrequest');
const request = require('request');



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
      console.log('sendPost status code', res.statusCode);
      if(err) console.log(err);
      resolve(res);
    });
  
  });

}

module.exports = {
  getPostsFromCat,
  getPost,
  prepPost,
  sendPost
}