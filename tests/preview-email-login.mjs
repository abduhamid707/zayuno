// Isolated UI fixture: real welcome screen/hook, no real email or Google requests.
// Run with node tests/preview-email-login.mjs; binds localhost only.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const mobile = createRequire(resolve('apps/mobile/package.json'));
const { build } = createRequire(require.resolve('tsx'))('esbuild');
const mocks = {
  'expo-auth-session/providers/google': 'export const useIdTokenAuthRequest=()=>[{},null,async()=>{}];',
  'react-native-nitro-google-signin': 'export const GoogleOneTapSignIn={configure:()=>{}};',
  'expo-haptics': 'export const notificationAsync=async()=>{}; export const NotificationFeedbackType={Success:1,Error:2};',
  'react-native-safe-area-context': "export {View as SafeAreaView} from 'react-native-web';",
  '@expo/vector-icons': "import React from 'react'; import {Text} from 'react-native-web'; export const Ionicons=({name,size,color})=><Text style={{fontSize:size,color}}>{name==='mail'?'✉':name==='arrow-back'?'←':name==='logo-google'?'G':name==='sparkles'?'✦':'→'}</Text>;",
  authStore: "export const useAuthStore=select=>select({setSession:async()=>{document.body.dataset.session='established';}});",
  assets: "export const brandAssets={logoGlow:{uri:'/logo.png'}};",
  api: `export class ApiError extends Error { constructor(status,message){super(message);this.status=status;} }
    export async function apiFetch(path,init){ const response=await fetch('/mock'+path,init); const data=await response.json(); if(!response.ok)throw new ApiError(response.status,data.message); return data; }`,
};
const output = await build({
  stdin: { contents: "import React from 'react'; import {createRoot} from 'react-dom/client'; import Welcome from './apps/mobile/app/(auth)/welcome'; createRoot(document.getElementById('root')).render(<Welcome/>);", resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, write: false, platform: 'browser', format: 'iife', nodePaths: [resolve('apps/mobile/node_modules')],
  define: { 'process.env': '{}', 'process.env.NODE_ENV': '"test"', 'process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID': '"fixture"', 'process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID': '""', 'process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID': '""', 'process.env.EXPO_PUBLIC_TERMS_URL': '""', 'process.env.EXPO_PUBLIC_PRIVACY_URL': '""' },
  plugins: [{ name: 'email-preview-fixtures', setup(b) {
    b.onResolve({ filter: /^react-native$/ }, () => ({ path: mobile.resolve('react-native-web') }));
    b.onResolve({ filter: /./ }, args => {
      const key = mocks[args.path] ? args.path : /\/store\/authStore$/.test(args.path) ? 'authStore' : /\/theme\/assets$/.test(args.path) ? 'assets' : /\/lib\/api$/.test(args.path) ? 'api' : null;
      return key ? { path: key, namespace: 'fixture' } : null;
    });
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: mocks[args.path], loader: 'tsx', resolveDir: resolve('apps/mobile') }));
  } }], logLevel: 'silent',
});
const counts = { send: 0, verify: 0 };
createServer(async (req,res) => {
  if (req.url === '/bundle.js') { res.setHeader('Content-Type','application/javascript'); return res.end(output.outputFiles[0].text); }
  if (req.url === '/logo.png') { res.setHeader('Content-Type','image/png'); return res.end(readFileSync('apps/mobile/assets/brand/logo2.png')); }
  if (req.url === '/counts') { res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify(counts)); }
  if (req.url?.startsWith('/mock/')) {
    let body=''; for await (const chunk of req) body+=chunk;
    const input=JSON.parse(body || '{}'); res.setHeader('Content-Type','application/json');
    if (req.url.endsWith('/send-code')) { counts.send++; if(input.email==='fail@example.com'){res.statusCode=503;return res.end(JSON.stringify({message:'Kod yuborilmadi. Qayta urinib ko‘ring.'}));} return res.end(JSON.stringify({success:true,retryAfterSeconds:3})); }
    counts.verify++; if(input.code!=='12345'){res.statusCode=401;return res.end(JSON.stringify({message:'Kod noto‘g‘ri.'}));}
    return res.end(JSON.stringify({accessToken:'fixture-only',refreshToken:'fixture-refresh',user:{id:'fixture'}}));
  }
  res.setHeader('Content-Type','text/html'); res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0;background:#141414}#root{display:flex}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
}).listen(4178,'127.0.0.1',()=>console.log('Isolated email login preview: http://127.0.0.1:4178 (code 12345; no external auth)'));
