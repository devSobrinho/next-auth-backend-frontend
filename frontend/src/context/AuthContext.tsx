import Router from 'next/router';
import { destroyCookie, parseCookies, setCookie } from 'nookies';
import { createContext, ReactNode, useEffect, useState } from 'react';

import { api } from '../services/apiClient';

type User = {
  email: string;
  permissions: string[];
  roles: string[];
}

type SignInCredentials = {
  email: string;
  password: string;
}

type AuthContextData = {
  signIn: (credentials: SignInCredentials) => Promise<void>;
  signOut: () => void;
  user: User;
  isAuthenticated: boolean;
}

type AuthProviderProps = {
  children: ReactNode;
}

export const AuthContext = createContext({} as AuthContextData);

let authChannel: BroadcastChannel

export function signOut() {
  destroyCookie(undefined, 'nextauth.token');
  destroyCookie(undefined, 'nextauth.refreshToken');

  authChannel.postMessage('signOut');
  
  Router.push('/')
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User>()
  const isAuthenticated = !!user;

  useEffect(() => {
    authChannel = new BroadcastChannel('auth');

    authChannel.onmessage = (message) => {
      switch (message.data) {
        case 'signOut':
          signOut();

          authChannel.close();
          break;
        case 'signIn':
          // Router.push('/dashboard');
          break;
        default:
          break;
      }
    }
  }, [])

  useEffect(() => {
    const { 'nextauth.token': token } = parseCookies();

    if (token) {
      api.get('/me').then(response => {
        const { email, permissions, roles } = response.data;

        setUser({email, permissions, roles});
      }).catch(() => {
        signOut()
      })
    }
  }, [])

  async function signIn({email, password}: SignInCredentials) {
    try {
      const response = await api.post('sessions', {
        email,
        password,
      })

      const { 
        permissions, 
        refreshToken, 
        roles, 
        token 
      } = response.data;

      // sessionStorage = não fica disponível em outras sessões
      // localStorage = browser apenas
      // cookies = armazenar dados no browser enviadas ou não, podendo ser acessado tanto do lado do browser quanto do servidor

      setCookie(undefined, 'nextauth.token', token, { // tratar/setar/destruir pelo lado do browser - NOME DO COOKIE - valor do token - opções do token
        maxAge: 60 * 60 * 24 * 30, // 30 dias
        path: '/', // Quais caminhos da app vão ter acesso  
      }) 
      setCookie(undefined, 'nextauth.refreshToken', refreshToken, {
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      }) 

      setUser({
        email,
        permissions,
        roles,
      })

      api.defaults.headers['Authorization'] = `Bearer ${token}`;

      Router.push('/dashboard')
      authChannel.postMessage('signIn')
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <AuthContext.Provider value={{signIn, signOut, isAuthenticated, user }}>
      {children}
    </AuthContext.Provider>
  )
}