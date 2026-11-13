# Diagnóstico de Carteira

Clone em HTML, CSS e JavaScript puro da ferramenta **"Comprar, vender ou manter"**
(diagnóstico de carteira da Semana Destravando / Jornada do Investidor Comum).

## O que mudou em relação ao original

| | Original | Este clone |
|---|---|---|
| Persistência | nenhuma — recarregou, perdeu tudo | botão **Salvar carteira** (`localStorage`) |
| Valores | só números inteiros (`R$ 1.234`) | aceita centavos (`R$ 1.234,56`) |
| Telemetria | enviava os dados para um Supabase de terceiros | removida |
| Fontes | hospedadas no site de origem | Google Fonts (Anton + Inter) |
| Estrutura | tudo dentro de um widget do Elementor | `index.html` + `css/style.css` + `js/app.js` |

O cálculo do diagnóstico (alvos por perfil, veredito por ativo, alertas e plano de
aporte) é idêntico ao do original.

## Como rodar

Basta abrir o `index.html` no navegador.

Para o salvamento funcionar de forma confiável, prefira servir por HTTP:

```bash
npx -y serve -l 5177 .
```

E acesse <http://localhost:5177>.

## Salvar / limpar

- **Salvar carteira** grava perfil, ativos e aporte mensal no `localStorage` do
  navegador. Ao reabrir a página, tudo volta preenchido.
- Enquanto houver mudanças não gravadas, aparece o aviso *"Alterações não salvas"*.
- **Limpar** apaga os dados salvos e recomeça do zero.

Os dados ficam **apenas no seu navegador** — nada é enviado para nenhum servidor.

## Valores decimais

Os campos de valor aceitam:

| Você digita | Vira |
|---|---|
| `1234,56` | 1.234,56 |
| `1.234,56` | 1.234,56 |
| `1234.56` | 1.234,56 |
| `1.234` | 1.234 (ponto como separador de milhar) |
| `1234` | 1.234 |

A formatação acontece ao sair do campo, para não atrapalhar a digitação dos centavos.

## Estrutura

```
index.html        marcação da página
css/style.css     estilos
js/app.js         estado, cálculo do diagnóstico, gráficos e persistência
```

## Publicação

Publicado pelo GitHub Pages direto do branch `main`, pasta raiz
(*Settings → Pages → Build and deployment → Source: Deploy from a branch*).

Cada push no `main` republica o site. O arquivo `.nojekyll` desliga o
processamento do Jekyll, que não faz falta aqui.

<https://ramondevillart.github.io/diagnostico_de_carteira/>

## Aviso

Material educacional. O diagnóstico avalia apenas o **peso** de cada posição dentro
da carteira — nunca a qualidade, o preço ou o futuro de um ativo. Não é recomendação
de compra ou venda.
