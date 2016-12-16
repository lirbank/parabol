import scSubscribeHandler from './scSubscribeHandler';
import scUnsubscribeHandler from './scUnsubscribeHandler';
import scGraphQLHandler from './scGraphQLHandler';
import {REFRESH_JWT_AFTER} from 'server/utils/serverConstants';
import getRetink from 'server/database/rethinkDriver';
import isObject from 'universal/utils/isObject';
import jwtDecode from 'jwt-decode';

// we do this otherwise we'd have to blacklist every token that ever got replaced & query that table for each query
const isTmsValid = (tmsFromDB, tmsFromToken) => {
  if (tmsFromDB.length !== tmsFromToken.length) return false;
  for (let i = 0; i < tmsFromDB.length; i++) {
    if (tmsFromDB[i] !== tmsFromToken[i]) return false;
  }
  return true;
};
export default function scConnectionHandler(exchange) {
  return async function connectionHandler(socket) {
    // socket.on('message', message => {
    //   if (message === '#2') return;
    //   console.log('SOCKET SAYS:', message);
    // });
    // if someone tries to replace their server-provided token with an older one that gives access to more teams, exit
    const subscribeHandler = scSubscribeHandler(exchange, socket);
    const unsubscribeHandler = scUnsubscribeHandler(exchange, socket);
    const graphQLHandler = scGraphQLHandler(exchange, socket);
    socket.on('message', (message) => {
      if (isObject(message) && message.event === '#authenticate') {
        const decodedToken = jwtDecode(message.data);
        const serverToken = socket.getAuthToken();
        if (decodedToken.exp < serverToken.exp) {
          socket.disconnect(4501, 'naughty nelly');
        }
      }
    });
    socket.on('graphql', graphQLHandler);
    socket.on('subscribe', subscribeHandler);
    socket.on('unsubscribe', unsubscribeHandler);
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    // the async part should come last so there isn't a race
    const r = getRetink();
    const authToken = socket.getAuthToken();
    const {exp, tms, sub: userId} = authToken;
    const now = new Date();
    const tokenExpiration = new Date(exp * 1000);
    const timeLeftOnToken = tokenExpiration - now;
    // if the user was booted from the team, give them a new token
    const tmsDB = await r.table('User').get(userId)('tms');
    const tmsIsValid = isTmsValid(tmsDB, tms);
    if (timeLeftOnToken < REFRESH_JWT_AFTER || !tmsIsValid) {
      authToken.tms = tmsDB;
      socket.setAuthToken(authToken);
    }
    // no need to wait for this, it's just for billing
    r.branch(
      r.table('User').get(userId)('inactive'),
      r.table('User')
        .get(userId)
        .replace((row) => {
          return row
            .without('inactive')
            .merge({
              updatedAt: now
            })
        })
        .do(() => {
          r.table('InactiveUser')
            .between([userId, r.minval], [userId, r.maxval], {index: 'userIdStartAt'})
            .filter((row) => row('endAt').not())
            .nth(0)
            .update({
              endAt: now
            })
        }),
      null
    )
  };
}
