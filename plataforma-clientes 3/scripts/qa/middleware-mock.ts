/* QA visual (QA_MOCK=1): o middleware de verdade renova a sessão contra o
   Supabase a cada request. Sem banco alcançável isso derruba toda rota
   antes de qualquer página renderizar. Aqui ele só deixa passar — a
   sessão de mentira vem do supabase-mock. */
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(_request: NextRequest) {
  return NextResponse.next();
}
