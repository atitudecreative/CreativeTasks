import { redirect } from "next/navigation";

// Aparência virou preferência pessoal (cada usuário mexe na própria),
// não faz mais sentido dentro da Administração — só redireciona quem
// tinha essa página salva/linkada pro novo lugar.
export default function AdminAparenciaRedirect() {
  redirect("/dashboard/aparencia");
}
