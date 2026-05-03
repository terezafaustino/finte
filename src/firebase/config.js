// ============================================================
//  CONFIGURAÇÃO FIREBASE — preencha com seus dados do console
//  https://console.firebase.google.com → Configurações do projeto
// ============================================================
import { initializeApp } from 'firebase/app'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || "SUA_API_KEY",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || "SEU_PROJETO.firebaseapp.com",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || "SEU_PROJECT_ID",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || "SEU_PROJETO.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "SEU_SENDER_ID",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || "SEU_APP_ID",
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

// Habilitar persistência offline (dados nunca se perdem mesmo sem internet)
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistência offline: múltiplas abas abertas')
  } else if (err.code === 'unimplemented') {
    console.warn('Persistência offline não suportada neste browser')
  }
})

export default app
