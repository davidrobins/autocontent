const Oauth = require('oauth-1.0a');
const crypto  = require('crypto');
const base64 = require('base-64');
const config = require('./config');


function createOauth(env) {

  const { clientKey, clientSecret, accessToken, accessTokenSecret } = config[env];

  const oauth = Oauth({
    consumer: {
      key: clientKey,
      secret: clientSecret,
    },
    signature_method: 'HMAC-SHA1',
    hash_function: (baseString, key) => { return crypto.createHmac('sha1', key).update(baseString).digest('base64') },
  });

  const oauthToken = {
    key: accessToken,
    secret: accessTokenSecret,
  };

  return { oauth, oauthToken };

}

function oauthRequest(env, uri, payload) { // 'scotdev', '/wp/v2/*', 'objectToSend'

  const { oauth, oauthToken } = createOauth(env);
  const { api } = config[env];  

  let authData = {
    url: `${api}${uri}`,
    method: 'POST',
  }
 
  const reqOptions = {
    url: authData.url,
    method: authData.method,
    body: payload,
    // headers: oauth.toHeader(oauth.authorize(authData, oauthToken)),
    json: true
  }

  reqOptions.headers = env == 'local' ? {'Authorization' : `Basic ${base64.encode('admin:password')}`} : oauth.toHeader(oauth.authorize(authData, oauthToken));

  return reqOptions;

}

module.exports = oauthRequest;