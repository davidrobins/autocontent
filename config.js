"use strict";

const config = {
  dev: {
    api: 'https://www-dev.uat-thesun.co.uk/wp-json',
    namespace: 'thesun',
    clientKey: 'TRrJxAlRtoON',
    clientSecret: '1fEOgJIPOPXV2crtm5Djw4OMeOadWP57Ox0J0jwTwZcW3ErR',
    accessToken: 'XD0ubal7i33SfbsYKnoteGm4',
    accessTokenSecret: 'FMLLIbgrQMe349gK1tAxookLMBH3kxziO0PnTjdS8om7nA8j',
  },
  scotdev: {
    api: 'https://www-dev.uat-thescottishsun.co.uk/wp-json',
    namespace: 'thescottishsun',
    clientKey: '3SUKD5Vjue8s',
    clientSecret: 'CPP7HoXQZ4AY8C4g0VPq1onjYYV8kgeaUniSuTHQVI6DHFYl',
    accessToken: 'GczW3u1ObaacH1Gr7xuaAKPO',
    accessTokenSecret: 'I8kngIzsP3nBWnU5u5mqB94MYGtaOUqXbhqCW9UGJmF0P6VA',
  },
  prod: {
    api: 'http://helios-production-api-cache.miki4tesma.eu-west-1.elasticbeanstalk.com/wp-json',
    namespace: 'thesun',
  }
};

module.exports = config;