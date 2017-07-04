export const relayHTTP = (authToken) => (operation, variables, cacheConfig, uploadables) => {
  return fetch('/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({
      query: operation.text,
      variables
    })
  }).then(response => {
    return response.json();
  });
};

export const relayWS = (socket) => (operation, variables, cacheConfig, uploadables) => {
  return new Promise((resolve) => {
    const request = {
      query: operation.text,
      variables
    };
    console.log('req', request)
    socket.emit('graphql', request, (error, response) => {
      resolve(response);
    });
  });
};