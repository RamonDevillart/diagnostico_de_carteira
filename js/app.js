/* =========================================================
   DIAGNÓSTICO DA CARTEIRA
   - valores aceitam centavos (1.234,56 / 1234.56 / 1234,5)
   - botão "Salvar carteira" persiste tudo no localStorage
   ========================================================= */
(function () {
  "use strict";

  var ROOT = document.getElementById("diag-carteira");
  if (!ROOT || ROOT.getAttribute("data-init")) return;
  ROOT.setAttribute("data-init", "1");

  var STORE_KEY = "diagCarteira.v1";

  var PERFIS = {
    fundacao:   { nome: "Fundação",   rf: 20 },
    construcao: { nome: "Construção", rf: 30 },
    transicao:  { nome: "Transição",  rf: 45 },
    colheita:   { nome: "Colheita",   rf: 60 }
  };

  var CLASSES = [
    { k: "rf",   nome: "Renda fixa",          curto: "Renda fixa", cor: "#22618F", ph: "CDB" },
    { k: "fii",  nome: "Fundos imobiliários", curto: "FIIs",       cor: "#2E7D32", ph: "HGLG11" },
    { k: "acao", nome: "Ações brasileiras",   curto: "Ações BR",   cor: "#7CA82B", ph: "ITSA4" },
    { k: "intl", nome: "Ações americanas",    curto: "EUA",        cor: "#B07C12", ph: "IVVB11" }
  ];

  function alvos(p) { var rf = PERFIS[p].rf, t = (100 - rf) / 3; return { rf: rf, fii: t, acao: t, intl: t }; }

  var S = { perfil: "construcao", aporte: 0 };
  var linhas = { rf: [], fii: [], acao: [], intl: [] };
  CLASSES.forEach(function (c) { linhas[c.k].push({ tk: "", vl: 0 }); linhas[c.k].push({ tk: "", vl: 0 }); });

  var sujo = false;

  /* ---------- helpers ---------- */
  function $(s, c) { return (c || ROOT).querySelector(s); }
  function $$(s, c) { return [].slice.call((c || ROOT).querySelectorAll(s)); }

  /* Aceita "1.234,56", "1234,5", "1234.56", "1.234" (milhar) e "1234" */
  function num(v) {
    if (v == null) return 0;
    var s = String(v).trim().replace(/[^\d.,]/g, "");
    if (!s) return 0;

    if (s.indexOf(",") > -1) {
      s = s.replace(/\./g, "").replace(/,/g, ".");          // vírgula = decimal
    } else if (s.indexOf(".") > -1) {
      var p = s.split(".");
      var ultimo = p[p.length - 1];
      if (p.length > 2 || ultimo.length === 3) s = p.join(""); // separador de milhar
      else s = p.slice(0, -1).join("") + "." + ultimo;         // ponto decimal
    }

    var n = parseFloat(s);
    return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
  }

  /* valor que já vem numérico (JSON salvo) — sem heurística de milhar */
  function numCru(v) {
    var n = (typeof v === "number") ? v : parseFloat(String(v == null ? "" : v).replace(",", "."));
    return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
  }

  function temCentavos(v) { return Math.abs(v - Math.round(v)) > 0.004; }

  function fmt(v) {
    if (!v) return "";
    var d = temCentavos(v) ? 2 : 0;
    return v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: 2 });
  }

  function brl(v) {
    v = Math.round(v * 100) / 100;
    var d = temCentavos(v) ? 2 : 0;
    return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function pct(v) { return (Math.round(v * 10) / 10).toLocaleString("pt-BR") + "%"; }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }

  function totalGrupo(k) { return linhas[k].reduce(function (a, l) { return a + l.vl; }, 0); }

  /* ---------- persistência ---------- */
  function msgSalvo(txt, cls) {
    var el = $("#dc_salvoMsg");
    if (!el) return;
    el.textContent = txt || "";
    el.className = "save-msg" + (cls ? " " + cls : "");
  }

  function dataHora(d) {
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear() +
           " às " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  function marcaSujo() {
    if (sujo) return;
    sujo = true;
    msgSalvo("Alterações não salvas.", "dirty");
  }

  function salvar() {
    var dados = {
      v: 1,
      perfil: S.perfil,
      aporte: S.aporte,
      linhas: linhas,
      salvoEm: new Date().toISOString()
    };
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(dados));
      sujo = false;
      msgSalvo("Salvo em " + dataHora(new Date()) + ".", "ok");
    } catch (e) {
      msgSalvo("Não foi possível salvar neste navegador.", "dirty");
    }
  }

  function lerSalvo() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      return (d && typeof d === "object") ? d : null;
    } catch (e) { return null; }
  }

  function hidratar(d) {
    if (d.perfil && PERFIS[d.perfil]) S.perfil = d.perfil;
    S.aporte = numCru(d.aporte);

    CLASSES.forEach(function (c) {
      var arr = (d.linhas && Object.prototype.toString.call(d.linhas[c.k]) === "[object Array]") ? d.linhas[c.k] : null;
      if (!arr || !arr.length) return;
      linhas[c.k] = arr.slice(0, 60).map(function (l) {
        return {
          tk: String((l && l.tk) || "").slice(0, 12).toUpperCase(),
          vl: numCru(l && l.vl)
        };
      });
    });
  }

  function limpar() {
    if (!window.confirm("Apagar os dados salvos e recomeçar do zero?")) return;
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    S.perfil = "construcao";
    S.aporte = 0;
    CLASSES.forEach(function (c) { linhas[c.k] = [{ tk: "", vl: 0 }, { tk: "", vl: 0 }]; });
    $("#dc_aporte").value = "";
    marcaPerfil();
    desenhaGrupos();
    sujo = false;
    msgSalvo("Dados apagados.", "");
    render();
  }

  /* ---------- sidebar: grupos de ativos ---------- */
  function desenhaGrupos() {
    $("#dc_grupos").innerHTML = CLASSES.map(function (c) {
      var tot = totalGrupo(c.k);
      return '<div class="grupo" data-k="' + c.k + '">' +
        '<div class="gh"><span class="dot" style="background:' + c.cor + '"></span>' +
        '<span class="nm">' + c.nome + '</span><span class="tt">' + (tot ? brl(tot) : "—") + '</span></div>' +
        linhas[c.k].map(function (l, i) {
          return '<div class="arow" data-i="' + i + '">' +
            '<div class="tk"><input type="text" data-f="tk" value="' + esc(l.tk) + '" placeholder="' + c.ph + '" maxlength="12" autocomplete="off"></div>' +
            '<div class="vl"><span class="cur">R$</span><input type="text" inputmode="decimal" data-f="vl" value="' + esc(fmt(l.vl)) + '" placeholder="0,00" autocomplete="off"></div>' +
            '<button type="button" class="del" data-del="' + i + '" title="remover">&times;</button></div>';
        }).join("") +
        '<button type="button" class="addr" data-add="' + c.k + '">+ ativo</button></div>';
    }).join("");
    liga();
  }

  /* mantém só dígitos, ponto e vírgula enquanto digita, sem pular o cursor */
  function sanitiza(inp) {
    var antes = inp.value;
    var limpo = antes.replace(/[^\d.,]/g, "");
    if (limpo === antes) return;
    var pos = inp.selectionStart || 0;
    var novaPos = antes.slice(0, pos).replace(/[^\d.,]/g, "").length;
    inp.value = limpo;
    try { inp.setSelectionRange(novaPos, novaPos); } catch (e) {}
  }

  function liga() {
    $$("#dc_grupos input").forEach(function (inp) {
      var k = inp.closest(".grupo").dataset.k;
      var i = +inp.closest(".arow").dataset.i;
      var f = inp.dataset.f;

      inp.addEventListener("input", function () {
        if (f === "tk") {
          inp.value = inp.value.toUpperCase();
          linhas[k][i].tk = inp.value;
        } else {
          sanitiza(inp);                       // não reformata: deixa digitar os centavos
          linhas[k][i].vl = num(inp.value);
          var t = totalGrupo(k);
          $(".tt", inp.closest(".grupo")).textContent = t ? brl(t) : "—";
        }
        marcaSujo();
        render();
      });

      if (f === "vl") {
        inp.addEventListener("blur", function () {
          inp.value = fmt(linhas[k][i].vl);    // formata bonito ao sair do campo
        });
      }
    });

    $$("#dc_grupos [data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.closest(".grupo").dataset.k;
        linhas[k].splice(+b.dataset.del, 1);
        if (!linhas[k].length) linhas[k].push({ tk: "", vl: 0 });
        marcaSujo();
        desenhaGrupos();
        render();
      });
    });

    $$("#dc_grupos [data-add]").forEach(function (b) {
      b.addEventListener("click", function () {
        linhas[b.dataset.add].push({ tk: "", vl: 0 });
        marcaSujo();
        desenhaGrupos();
      });
    });
  }

  function marcaPerfil() {
    $$("#dc_perfil .pf").forEach(function (x) { x.classList.remove("sel"); });
    var sel = $('#dc_perfil .pf[data-p="' + S.perfil + '"]');
    if (sel) sel.classList.add("sel");
  }

  /* ---------- diagnóstico ---------- */
  function diagnostico() {
    var A = alvos(S.perfil), T = 0;
    CLASSES.forEach(function (c) { linhas[c.k].forEach(function (l) { T += l.vl; }); });

    var porClasse = {}, ativos = [];
    CLASSES.forEach(function (c) {
      var lista = linhas[c.k].filter(function (l) { return l.vl > 0; });
      var soma = lista.reduce(function (a, l) { return a + l.vl; }, 0);
      var idealCada = lista.length ? A[c.k] / lista.length : 0;
      porClasse[c.k] = { soma: soma, atual: T ? soma / T * 100 : 0, alvo: A[c.k], n: lista.length, cor: c.cor, nome: c.nome, curto: c.curto };
      lista.forEach(function (l) {
        var p = T ? l.vl / T * 100 : 0, r = idealCada > 0 ? p / idealCada : 0, v;
        if (r >= 1.6)        v = { k: "red", t: "Reduzir" };
        else if (r >= 1.25)  v = { k: "aci", t: "Acima" };
        else if (r < 0.75)   v = { k: "ref", t: "Reforçar" };
        else                 v = { k: "man", t: "Manter" };
        if (p >= 20 && r >= 1.25 && c.k !== "intl") v = { k: "red", t: "Reduzir" };
        ativos.push({ tk: l.tk || "—", classe: c.k, cor: c.cor, valor: l.vl, pct: p, ideal: idealCada, razao: r, verd: v, nomeClasse: c.nome });
      });
    });

    var s = 0; CLASSES.forEach(function (c) { s += Math.abs(porClasse[c.k].atual - A[c.k]); });
    return {
      T: T, A: A, porClasse: porClasse, ativos: ativos, desvio: s / 2,
      maior: ativos.reduce(function (m, a) { return a.pct > m ? a.pct : m; }, 0),
      /* ETF internacional não conta: uma cota já representa centenas de empresas */
      maiorConc: ativos.reduce(function (m, a) { return (a.classe !== "intl" && a.pct > m) ? a.pct : m; }, 0)
    };
  }

  function eixo(escala) {
    var passo = escala > 60 ? 20 : escala > 30 ? 10 : 5, h = "";
    for (var v = 0; v <= escala; v += passo) h += '<span style="bottom:' + (v / escala * 100) + '%">' + v + '%</span>';
    return '<div class="yl">' + h + '</div>';
  }

  /* ---------- painel ---------- */
  function render() {
    var d = diagnostico();
    if (d.T <= 0 || !d.ativos.length) {
      $("#dc_painel").innerHTML = '<div class="vazio"><b>Comece digitando seus ativos</b>Os gráficos aparecem aqui e se atualizam a cada valor.</div>';
      return;
    }

    var P = PERFIS[S.perfil];
    var nRed = d.ativos.filter(function (a) { return a.verd.k === "red"; }).length;
    var nRef = d.ativos.filter(function (a) { return a.verd.k === "ref"; }).length;
    var nMan = d.ativos.length - nRed - nRef;
    var fora = d.T * d.desvio / 100;

    var maxV = 0; CLASSES.forEach(function (c) { maxV = Math.max(maxV, d.porClasse[c.k].atual, d.porClasse[c.k].alvo); });
    var escC = Math.max(maxV * 1.18, 25);
    var maxA = 0; d.ativos.forEach(function (a) { maxA = Math.max(maxA, a.pct, a.ideal); });
    var escA = Math.max(maxA * 1.22, 12);

    var g1 = CLASSES.map(function (c) {
      var x = d.porClasse[c.k], dif = x.atual - x.alvo;
      return '<div class="cgrp"><div class="cbars">' +
        '<div class="cbar" style="height:' + (x.atual / escC * 100) + '%;background:' + c.cor + '">' +
          '<span style="color:' + c.cor + '">' + Math.round(x.atual) + '%</span></div>' +
        '<div class="cbar alvo" style="height:' + (x.alvo / escC * 100) + '%">' +
          '<span style="color:var(--gold)">' + Math.round(x.alvo) + '%</span></div></div>' +
        '<div class="clab">' + c.curto + '<br><span style="color:' +
        (Math.abs(dif) < 3 ? "var(--muted)" : (dif > 0 ? "var(--red)" : "var(--lime)")) + '">' +
        (Math.abs(dif) < 3 ? "no alvo" : (dif > 0 ? "+" : "−") + Math.round(Math.abs(dif)) + "%") + '</span></div></div>';
    }).join("");

    var g2 = "", primeiro = true;
    CLASSES.forEach(function (c) {
      var lista = d.ativos.filter(function (a) { return a.classe === c.k; }).sort(function (a, b) { return b.pct - a.pct; });
      if (!lista.length) return;
      if (!primeiro) g2 += '<div class="sep"></div>';
      primeiro = false;
      g2 += lista.map(function (a) {
        return '<div class="abar"><div class="acol">' +
          '<div class="fill" style="height:' + (a.pct / escA * 100) + '%;background:' + c.cor + '"><em>' + pct(a.pct) + '</em></div>' +
          '<div class="ideal" style="bottom:' + (a.ideal / escA * 100) + '%"></div></div>' +
          '<div class="atk" style="color:' + c.cor + '">' + esc(a.tk) + '</div>' +
          '<div class="av ' + a.verd.k + '">' + a.verd.t + '</div></div>';
      }).join("");
    });

    var reforcar = d.ativos.filter(function (a) { return a.verd.k === "ref"; }).sort(function (a, b) { return a.razao - b.razao; });
    var reduzir  = d.ativos.filter(function (a) { return a.verd.k === "red" || a.verd.k === "aci"; }).sort(function (a, b) { return b.razao - a.razao; });

    var F = [];
    if (d.maiorConc >= 20) F.push(["bad", "Sua maior posição é " + pct(d.maiorConc) + " da carteira",
      "Um ativo sozinho decide o seu resultado. A referência é no máximo 5% a 10% por ativo. Não precisa vender tudo de uma vez: pare de aportar nele e mande os próximos aportes para o resto."]);
    else if (d.maiorConc >= 10) F.push(["warn", "Maior posição em " + pct(d.maiorConc),
      "Acima do confortável, mas dá pra corrigir só com aporte. Deixe essa posição parada e reforce as outras."]);
    else F.push(["ok", "Nenhum ativo domina a carteira", "Maior posição individual em " + pct(d.maiorConc) + ". É assim que deve ser."]);

    if (d.porClasse.intl.n === 1 && d.porClasse.intl.soma > 0)
      F.push(["ok", "Um único ETF já cobre a fatia internacional",
        "Uma cota do IVVB11 representa as 500 maiores empresas americanas. Aqui não faz falta ter vários ativos — a diversificação já vem embutida."]);

    CLASSES.forEach(function (c) {
      var x = d.porClasse[c.k];
      if (x.soma === 0 && x.alvo > 0) F.push(["warn", "Nada em " + c.nome.toLowerCase(),
        "O seu momento pede " + pct(x.alvo) + " nessa classe. É o destino natural dos próximos aportes."]);
      else if (c.k !== "rf" && c.k !== "intl" && x.atual >= 12 && x.n > 0 && x.n < 4) F.push(["warn", "Só " + x.n + " ativo" + (x.n === 1 ? "" : "s") + " em " + c.curto.toLowerCase(),
        "A classe pesa " + pct(x.atual) + " apoiada em poucos nomes. A referência é chegar a 10–15 por classe, aos poucos."]);
    });

    var planoHTML;
    if (S.aporte > 0) {
      var futuro = d.T + S.aporte * 6, gaps = [], sg = 0;
      CLASSES.forEach(function (c) {
        var g = futuro * d.A[c.k] / 100 - d.porClasse[c.k].soma;
        if (g > 0) { gaps.push({ nome: c.nome, cor: c.cor, g: g, k: c.k }); sg += g; }
      });
      planoHTML = gaps.length
        ? '<p class="cs">Sem vender nada: direcionando ' + brl(S.aporte) + ' por mês, a carteira se reequilibra em cerca de 6 meses.</p>' +
          gaps.map(function (g) {
            var alvo = d.ativos.filter(function (a) { return a.classe === g.k && a.verd.k !== "red" && a.verd.k !== "aci"; })
              .sort(function (a, b) { return a.razao - b.razao; }).slice(0, 3).map(function (a) { return a.tk; }).join(", ");
            return '<div class="prow"><div class="nm">' + g.nome + '<small>' +
              (alvo ? "comece por: " + esc(alvo) : "classe ainda vazia") + '</small></div>' +
              '<div class="vl" style="color:' + g.cor + '">' + brl(S.aporte * (g.g / sg)) + '<small>/mês</small></div></div>';
          }).join("")
        : '<p class="cs" style="margin:0">Todas as classes já estão no alvo. Distribua o aporte mantendo a proporção.</p>';
    } else {
      planoHTML = '<p class="cs" style="margin:0">Informe o aporte mensal ao lado para ver o plano de correção sem venda.</p>';
    }

    $("#dc_painel").innerHTML =
      '<div class="kpis">' +
        '<div class="kpi"><div class="n">' + pct(d.desvio) + '</div><div class="l">fora do lugar<br>' + brl(fora) + '</div></div>' +
        '<div class="kpi"><div class="n b">' + d.ativos.length + '</div><div class="l">ativos<br>' + brl(d.T) + '</div></div>' +
        '<div class="kpi"><div class="n">' + nRef + '</div><div class="l">para reforçar</div></div>' +
        '<div class="kpi"><div class="n g">' + nMan + '</div><div class="l">para manter</div></div>' +
        '<div class="kpi"><div class="n r">' + nRed + '</div><div class="l">para avaliar reduzir</div></div></div>' +

      '<div class="card"><p class="ct">Onde está × onde deveria estar</p>' +
        '<p class="cs">Coluna cheia é a sua carteira hoje. Coluna hachurada ao lado é o alvo do seu momento.</p>' +
        '<div class="gcls">' + eixo(escC) + g1 + '</div>' +
        '<div class="leg"><span><i style="background:#2E7D32"></i>hoje</span>' +
        '<span><i class="hach"></i>alvo do seu perfil</span></div></div>' +

      '<div class="card"><p class="ct">Cada ativo e o nível ideal dele</p>' +
        '<p class="cs">A linha tracejada dourada é onde a posição deveria estar. Coluna acima da linha: sobrou. Abaixo: falta.</p>' +
        '<div class="gat">' + eixo(escA) + '<div class="gatin">' + g2 + '</div></div>' +
        '<div class="leg"><span><span class="dash"></span>nível ideal do ativo</span>' +
        '<span><i style="background:#C62828"></i>reduzir</span>' +
        '<span><i style="background:#B07C12"></i>acima</span>' +
        '<span><i style="background:var(--lime)"></i>reforçar</span></div></div>' +

      '<div class="card"><p class="ct">O que fazer agora</p><div class="acoes">' +
        '<div class="acx ref"><p class="h">Reforçar nos próximos aportes</p>' +
          (reforcar.length ? '<ul>' + reforcar.map(function (a) {
            return '<li><b style="color:' + a.cor + '">' + esc(a.tk) + '</b> — está em ' + pct(a.pct) + ', ideal ' + pct(a.ideal) + '</li>';
          }).join("") + '</ul>' : '<p class="none">Nada abaixo do peso.</p>') + '</div>' +
        '<div class="acx red"><p class="h">Avaliar reduzir ou parar de aportar</p>' +
          (reduzir.length ? '<ul>' + reduzir.map(function (a) {
            return '<li><b style="color:' + a.cor + '">' + esc(a.tk) + '</b> — está em ' + pct(a.pct) + ', ideal ' + pct(a.ideal) + '</li>';
          }).join("") + '</ul>' : '<p class="none">Nenhuma posição estourou o peso.</p>') + '</div></div></div>' +

      '<div class="card"><p class="ct">Alertas</p>' + F.map(function (f) {
        return '<div class="flag ' + f[0] + '"><p class="t">' + esc(f[1]) + '</p><p class="b">' + f[2] + '</p></div>';
      }).join("") + '</div>' +

      '<div class="card"><p class="ct">Para onde mandar os próximos aportes</p>' + planoHTML + '</div>' +

      '<div class="cta"><h3>Sua carteira na mesa, ao vivo</h3>' +
        '<p>Na Aula 4 eu abro carteiras reais na tela e mostro, uma a uma, o que ajustar. A sua pode ser uma delas.</p>' +
        '<a class="btn" href="https://bit.ly/SDI_formraiox" target="_blank" rel="noopener">Enviar minha carteira pro Raio-X</a>' +
        '<button type="button" class="ghost" id="dc_r_copy">Copiar diagnóstico</button>' +
        '<div class="summary" id="dc_r_sum"></div></div>' +

      '<p class="foot"><b>Como ler isso.</b> O diagnóstico avalia apenas o <b>peso</b> de cada posição dentro da sua própria carteira — ' +
      'nunca a qualidade, o preço ou o futuro de um ativo. "Reduzir" significa que a posição ficou grande demais frente ao seu plano, ' +
      'não que o ativo seja ruim. Material educacional da Semana Destravando seus Investimentos; não é recomendação de compra ou venda.</p>';

    var resumo = "DIAGNÓSTICO DA CARTEIRA — Semana Destravando seus Investimentos\n" +
      "Perfil: " + P.nome + "\nCarteira: " + brl(d.T) + " em " + d.ativos.length + " ativos\n" +
      "Fora do lugar: " + pct(d.desvio) + " (" + brl(fora) + ")\nMaior posição: " + pct(d.maiorConc) + "\n\nCLASSES:\n" +
      CLASSES.map(function (c) {
        var x = d.porClasse[c.k];
        return "· " + c.nome + ": " + pct(x.atual) + " (alvo " + pct(x.alvo) + ") — " + x.n + " ativos";
      }).join("\n") +
      "\n\nATIVOS:\n" + d.ativos.slice().sort(function (a, b) { return b.pct - a.pct; }).map(function (a) {
        return "· " + a.tk + " [" + a.nomeClasse + "] " + pct(a.pct) + " (ideal " + pct(a.ideal) + ") → " + a.verd.t;
      }).join("\n") +
      "\n\nAporte: " + brl(S.aporte) + "/mês";

    $("#dc_r_sum").textContent = resumo;
    $("#dc_r_copy").onclick = function (e) {
      e.preventDefault();
      $("#dc_r_sum").style.display = "block";
      copiar(resumo);
      $("#dc_r_copy").textContent = "Copiado";
    };
  }

  /* copia com fallback (alguns navegadores bloqueiam clipboard) */
  function copiar(txt) {
    function fallback() {
      var t = document.createElement("textarea");
      t.value = txt; t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(t);
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).catch(fallback);
    else fallback();
  }

  /* ---------- eventos fixos ---------- */
  $$("#dc_perfil .pf").forEach(function (o) {
    o.addEventListener("click", function () {
      S.perfil = o.dataset.p;
      marcaPerfil();
      marcaSujo();
      render();
    });
  });

  var inpAporte = $("#dc_aporte");
  inpAporte.addEventListener("input", function () {
    sanitiza(this);
    S.aporte = num(this.value);
    marcaSujo();
    render();
  });
  inpAporte.addEventListener("blur", function () { this.value = fmt(S.aporte); });

  $("#dc_salvar").addEventListener("click", salvar);
  $("#dc_limpar").addEventListener("click", limpar);

  /* ---------- boot ---------- */
  var salvo = lerSalvo();
  if (salvo) {
    hidratar(salvo);
    inpAporte.value = fmt(S.aporte);
    var dt = new Date(salvo.salvoEm);
    msgSalvo(isFinite(dt.getTime()) ? "Carteira salva em " + dataHora(dt) + "." : "Carteira salva recuperada.", "ok");
  }
  marcaPerfil();
  desenhaGrupos();
  render();

  /* ===== contador da tarja — prazo fixo no fuso de Brasília (UTC-3) ===== */
  (function () {
    var FIM = new Date("2026-11-12T23:59:59-03:00");
    var el = $("#dc_jicCd");
    if (!el) return;
    function p(n) { return (n < 10 ? "0" : "") + n; }
    var tmr;
    function tick() {
      var ms = FIM - new Date();
      if (ms <= 0) { el.textContent = "encerrado"; el.className = "cd fim"; clearInterval(tmr); return; }
      var d = Math.floor(ms / 86400000);
      var h = Math.floor(ms % 86400000 / 3600000);
      var m = Math.floor(ms % 3600000 / 60000);
      var s = Math.floor(ms % 60000 / 1000);
      el.textContent = (d > 0 ? d + "d " : "") + p(h) + "h " + p(m) + "m " + p(s) + "s";
    }
    tick(); tmr = setInterval(tick, 1000);
  })();

})();
