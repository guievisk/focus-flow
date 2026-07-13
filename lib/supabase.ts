// lib/supabase.ts
// DEPRECIADO: o cliente vive em lib/data/supabase/client.ts.
// Este re-export existe só durante a migração das telas para a camada de
// dados (lib/data/) e será removido na tarefa T031 da feature 001.
export { supabase } from '@/lib/data/supabase/client'
