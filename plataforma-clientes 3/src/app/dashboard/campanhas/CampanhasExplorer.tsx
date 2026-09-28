"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { normalizar } from "@/lib/texto";
import { formatarDiaMes } from "@/lib/dates";
import {
  Badge, EmptyState, Icon, Panel, SearchInput, Select, Toolbar, cn,
} from "@/components/ui";
import { saudeTone } from "@/lib/statusColors";
import { formatMoney } from "@/lib/metricLanguage";
import { SAUDE_OPTIONS, TIPO_OPTIONS } from "@/lib/campaignOptions";
import { Timeline } from "@/components/charts/Timeline";

export type CampaignCardData = {
  id: string;
  nome: string;
  identificador: string | null;
  tipo: string;
  tipoLabel: string;
  fase: string;
  faseLabel: string;
  saude: string;
  saudeLabel: string;
  dataInicio: string | null;
  dataTermino: string | null;
  dataEvento: string | null;
  orcamentoAprovado: number | null;
  investimento: number | null;
  demandasTotal: number | null;
  demandasConcluidas: number | null;
  entregasTotal: number | null;
  progressoMarcos: number | null;
  alcance: number | null;
  capaUrl: string | null;
};

/* =========================================================================
   CAMPANHAS E EVENTOS
   -------------------------------------------------------------------------
   O que esta tela era: uma grade de cards, cada um com 200px de retângulo
   cinza e uma letra gigante no lugar da capa. Dois cards numa tela de
   1440px deixavam dois terços da página vazios, e a informação real — nome,
   saúde, período, orçamento — ocupava a faixa de baixo.

   Três decisões:

   1. A LISTA É UMA GALERIA DE QUATRO COLUNAS: capa e nome, que é como se
      reconhece um evento. Para a capa caber de verdade, o trilho lateral
      saiu desta tela — com ele, a coluna principal tem ~770px e quatro
      cartões ficariam com 180px cada, ou seja, uma miniatura. Sem ele são
      ~265px, que é uma capa. Os números do trilho viraram uma faixa acima
      da grade, na mesma ordem de leitura.

   2. CAMPANHA SEM CAPA não recebe um retângulo cinza com uma letra
      gigante, que era o que havia antes: recebe um campo neutro com o
      ícone do tipo, da mesma altura dos outros, para a grade não ficar
      irregular. Nada é inventado para preencher — capa que não existe
      continua não existindo.

   3. A LINHA DO TEMPO CONTINUA. A pergunta "quando é o quê" não tinha
      resposta em lugar nenhum: as datas eram texto solto em cada card.
      Agora o calendário do ministério se lê de uma vez, com sobreposições
      visíveis — e, sem o trilho, na largura inteira.

   O agrupamento por situação continua: o que exige atenção vem primeiro,
   porque é a ordem de quem abre esta tela para trabalhar.

   Nenhum número aqui é novo: demandas, entregas, progresso e gasto de mídia
   já estavam na view `campanha_perfil` e não apareciam antes de alguém
   abrir a campanha.
   ========================================================================= */

type SortKey = "cronologica" | "investimento" | "nome";

function periodLabel(c: CampaignCardData): string | null {
  if (c.dataEvento) return `Evento em ${formatarDiaMes(c.dataEvento, "")}`;
  const i = formatarDiaMes(c.dataInicio, "");
  const f = formatarDiaMes(c.dataTermino, "");
  if (i && f) return `${i} — ${f}`;
  return i || f || null;
}

function dataDeOrdem(c: CampaignCardData): string {
  return c.dataEvento ?? c.dataTermino ?? c.dataInicio ?? "";
}

/** Capa da campanha. Link externo ou do storage, então pode falhar: se
 *  falhar, cai no mesmo campo neutro de quem não tem capa, em vez do ícone
 *  de imagem quebrada do navegador. */
function Capa({ url, tipoLabel }: { url: string | null; tipoLabel: string }) {
  const [falhou, setFalhou] = useState(false);

  if (!url || falhou) {
    // Campanha sem capa é a maioria hoje. Em vez de um retângulo mudo, o
    // campo neutro diz o TIPO — dado que já existe no cadastro, e a única
    // coisa que distingue um cartão sem imagem do outro.
    return (
      <div className="flex aspect-[3/2] w-full flex-col items-center justify-center gap-1.5 bg-surface-sunken">
        <Icon.Megaphone className="h-5 w-5 text-ink-3" aria-hidden="true" />
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.06em] text-ink-3">
          {tipoLabel}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- capa vem de URL externa, sem domínio conhecido em build time
    <img
      src={url}
      alt=""
      loading="lazy"
      onError={() => setFalhou(true)}
      className="aspect-[3/2] w-full bg-surface-sunken object-cover transition-transform duration-240 ease-snap group-hover/capa:scale-[1.03]"
    />
  );
}

function CartaoCampanha({ c }: { c: CampaignCardData }) {
  const periodo = periodLabel(c);

  return (
    <Link
      href={`/dashboard/campanhas/${c.id}`}
      className={cn(
        "group/capa flex min-w-0 flex-col overflow-hidden rounded-card border border-line bg-surface shadow-xs",
        "transition-colors duration-120 hover:border-line-strong hover:bg-surface-sunken/40",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      )}
    >
      <div className="relative overflow-hidden">
        <Capa url={c.capaUrl} tipoLabel={c.tipoLabel} />
        {c.saude === "critica" && (
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-danger" />
        )}
      </div>

      <div className="min-w-0 p-3">
        {/* O nome é o que a pessoa procura: duas linhas antes de cortar, e
            não uma só com reticências no meio da palavra. */}
        <h3 className="line-clamp-2 text-small font-medium leading-snug text-ink">{c.nome}</h3>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge tone={saudeTone(c.saude)} size="sm" dot>
            {c.saudeLabel}
          </Badge>
          {periodo && <span className="min-w-0 truncate text-caption text-ink-3">{periodo}</span>}
        </div>
      </div>
    </Link>
  );
}

/** Uma faixa de campanhas com cabeçalho. Substitui o BoardGroup: a grade
 *  não tem cabeçalho grudento, então o grupo vira um título com contagem. */
function Faixa({
  titulo,
  meta,
  itens,
}: {
  titulo: string;
  meta?: string;
  itens: CampaignCardData[];
}) {
  if (itens.length === 0) return null;

  return (
    <section className="min-w-0">
      <div className="mb-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-line pb-1.5">
        <h2 className="text-h4 text-ink">{titulo}</h2>
        <span className="font-mono text-label uppercase tabular-nums text-ink-3">{itens.length}</span>
        {meta && <span className="min-w-0 truncate text-caption text-ink-3">{meta}</span>}
      </div>
      <div className="signal-stagger grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {itens.map((c) => (
          <CartaoCampanha key={c.id} c={c} />
        ))}
      </div>
    </section>
  );
}

export function CampanhasExplorer({
  campaigns,
  hoje,
}: {
  campaigns: CampaignCardData[];
  hoje: string;
}) {
  const [busca, setBusca] = useState("");
  const [saude, setSaude] = useState("");
  const [tipo, setTipo] = useState("");
  const [ordem, setOrdem] = useState<SortKey>("cronologica");

  const filtradas = useMemo(() => {
    const termo = normalizar(busca);
    const lista = campaigns.filter((c) => {
      const casaBusca =
        !termo ||
        normalizar(c.nome).includes(termo) ||
        (c.identificador ? normalizar(c.identificador).includes(termo) : false);
      return casaBusca && (!saude || c.saude === saude) && (!tipo || c.tipo === tipo);
    });

    return [...lista].sort((a, b) => {
      if (ordem === "nome") return a.nome.localeCompare(b.nome, "pt-BR");
      if (ordem === "investimento") return (b.investimento ?? -1) - (a.investimento ?? -1);
      // Cronológica: mais próximo de hoje primeiro, sem data por último.
      const da = dataDeOrdem(a);
      const db = dataDeOrdem(b);
      if (!da && !db) return a.nome.localeCompare(b.nome, "pt-BR");
      if (!da) return 1;
      if (!db) return -1;
      return db.localeCompare(da);
    });
  }, [campaigns, busca, saude, tipo, ordem]);

  const temFiltro = Boolean(busca.trim() || saude || tipo);

  // Totais do que está NA TELA — se o usuário filtrou, o resumo tem que
  // falar do recorte dele, senão os números do trilho contradizem a lista.
  const resumo = useMemo(() => {
    const comInvestimento = filtradas.filter((c) => c.investimento != null);
    return {
      total: filtradas.length,
      emRisco: filtradas.filter((c) => c.saude === "atencao" || c.saude === "critica").length,
      ativas: filtradas.filter((c) => c.saude !== "concluida").length,
      investimento: comInvestimento.reduce((s, c) => s + (c.investimento ?? 0), 0),
      comInvestimento: comInvestimento.length,
      demandas: filtradas.reduce((s, c) => s + (c.demandasTotal ?? 0), 0),
      entregas: filtradas.reduce((s, c) => s + (c.entregasTotal ?? 0), 0),
    };
  }, [filtradas]);

  // Agrupamento por situação: "exigindo atenção" primeiro é a ordem de
  // leitura de quem abre esta tela para trabalhar, não para navegar.
  const emRisco = filtradas.filter((c) => c.saude === "atencao" || c.saude === "critica");
  const andamento = filtradas.filter(
    (c) => c.saude !== "atencao" && c.saude !== "critica" && c.saude !== "concluida"
  );
  const concluidas = filtradas.filter((c) => c.saude === "concluida");

  return (
    <>
      <Toolbar>
        <SearchInput
          value={busca}
          onValueChange={setBusca}
          placeholder="Buscar campanha ou evento..."
          className="min-w-[12rem] flex-1 sm:max-w-xs"
        />
        <Select
          value={saude}
          onChange={(e) => setSaude(e.target.value)}
          aria-label="Filtrar por situação"
          className="w-full"
          containerClassName="min-w-0 flex-1 basis-[calc(50%-0.75rem)] sm:basis-auto"
        >
          <option value="">Todas as situações</option>
          {SAUDE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
        <Select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          aria-label="Filtrar por tipo"
          className="w-full"
          containerClassName="min-w-0 flex-1 basis-[calc(50%-0.75rem)] sm:basis-auto"
        >
          <option value="">Todos os tipos</option>
          {TIPO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
        <Select
          value={ordem}
          onChange={(e) => setOrdem(e.target.value as SortKey)}
          aria-label="Ordenar"
          className="w-full"
          containerClassName="min-w-0 flex-1 basis-[calc(50%-0.75rem)] sm:basis-auto"
        >
          <option value="cronologica">Mais recentes</option>
          <option value="investimento">Maior investimento</option>
          <option value="nome">Nome</option>
        </Select>
        {temFiltro && (
          <span className="font-mono text-label uppercase text-ink-3">
            {filtradas.length} de {campaigns.length}
          </span>
        )}
      </Toolbar>


      {/* Os números que ficavam no trilho. Numa tela cujo conteúdo é uma
          galeria, o trilho custaria 320px de largura — o suficiente para a
          capa deixar de ser capa. Aqui eles ocupam uma faixa de uma linha,
          na mesma ordem de leitura. */}
      <div className="mb-4 flex flex-wrap items-baseline gap-x-5 gap-y-2 border-b border-line pb-3">
        <span className="flex items-baseline gap-1.5">
          <span className="text-metric-sm tabular-nums text-ink">{resumo.ativas}</span>
          <span className="font-mono text-label uppercase text-ink-3">
            {resumo.ativas === 1 ? "campanha ativa" : "campanhas ativas"}
          </span>
        </span>
        {resumo.total !== resumo.ativas && (
          <span className="flex items-baseline gap-1.5">
            <span className="text-metric-sm tabular-nums text-ink-2">{resumo.total - resumo.ativas}</span>
            <span className="font-mono text-label uppercase text-ink-3">concluídas</span>
          </span>
        )}
        {resumo.emRisco > 0 && (
          <span className="flex items-baseline gap-1.5">
            <span className="text-metric-sm tabular-nums text-warning">{resumo.emRisco}</span>
            <span className="font-mono text-label uppercase text-ink-3">exigindo atenção</span>
          </span>
        )}
        {resumo.comInvestimento > 0 && (
          <span className="flex items-baseline gap-1.5">
            <span className="text-metric-sm tabular-nums text-ink">{formatMoney(resumo.investimento, true)}</span>
            <span className="font-mono text-label uppercase text-ink-3">
              investidos em {resumo.comInvestimento} de {resumo.total}
            </span>
          </span>
        )}
        {resumo.demandas > 0 && (
          <span className="flex items-baseline gap-1.5">
            <span className="text-metric-sm tabular-nums text-ink">{resumo.demandas}</span>
            <span className="font-mono text-label uppercase text-ink-3">
              {resumo.demandas === 1 ? "demanda vinculada" : "demandas vinculadas"}
            </span>
          </span>
        )}
      </div>

      {/* A linha do tempo só faz sentido com espaço horizontal: abaixo de
          `md` uma barra de 3% de largura é um traço sem leitura, e a grade
          logo abaixo já está em ordem cronológica. */}
      {filtradas.length > 1 && (
        <Panel
          title="Quando é o quê"
          description="Período de cada campanha, com a data do evento marcada"
          className="mb-5 hidden md:block"
        >
          <Timeline
            hoje={hoje}
            itens={filtradas.map((c) => ({
              id: c.id,
              nome: c.nome,
              inicio: c.dataInicio,
              termino: c.dataTermino,
              marco: c.dataEvento,
              saude: c.saude,
              saudeLabel: c.saudeLabel,
              href: `/dashboard/campanhas/${c.id}`,
            }))}
          />
        </Panel>
      )}

      {filtradas.length === 0 ? (
        <EmptyState
          icon={<Icon.Search className="h-5 w-5" />}
          title="Nenhuma campanha para este filtro"
          description="Tente outro termo de busca ou limpe os filtros para ver tudo de novo."
        />
      ) : (
        <div className="space-y-6">
          <Faixa titulo="Exigindo atenção" meta="Saúde marcada como atenção ou crítica" itens={emRisco} />
          <Faixa titulo="Em andamento" itens={andamento} />
          <Faixa titulo="Concluídas" itens={concluidas} />
        </div>
      )}
    </>
  );
}
