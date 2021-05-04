import React, { useState, useEffect } from 'react';
import { Router, navigate } from '@reach/router';

import Navigation from './components/Navigation';
import Login from './components/Login';
import Protected from './components/Protected';
import Content from './components/Content';
import Register from './components/Register';

export const UserContext = React.createContext([]);

function App() {
  const [ user, setUser ] = useState({});
  const [ loading, setLoading ] = useState(true);

  const logOutCallback = async () => {
    await fetch('http://localhost:4000/logout', {
      method: 'POST',
      credentials: 'include'
    })
    //Clear user from context
    setUser({});
    navigate('/');
  }
  // if refresh_token exists, get a new access token
  useEffect(()=> {
    async function checkRefreshToken() {
      const result = await(await fetch('http://localhost:4000/refresh_token', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application-json'
        }
      })).json();
      setUser({
        accesstoken: result.accesstoken
      });
      setLoading(false);
    }
    //can't have an async useEffect, so we need to create an async function inside and call it
    checkRefreshToken();
  }, [])

  if(loading) return <div>Loading ...</div>
  return (
    <UserContext.Provider value={[user, setUser]}>
       <div className="app">
         <Navigation logOutCallback={logOutCallback}/>
         <Router id="router">
           <Login path="login" />
           <Register path="register" />
           <Protected path="protected" />
           <Content path="/" />
         </Router>
       </div>
    </UserContext.Provider>

  );
}

export default App;
