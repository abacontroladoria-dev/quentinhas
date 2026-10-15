// Datas de calendário (texto yyyy-MM-dd) e ciclo semanal do cardápio: terça → segunda seguinte.
// Toda a aritmética é feita em UTC sobre datas sem hora, para não sofrer com fuso/horário de verão.

// Posição de cada dia no ciclo, em dias a partir da terça. Sábado e domingo não têm almoço.
var DIAS_CICLO_ = [
  { dia: 'TERCA', rotulo: 'Terça-feira', deslocamento: 0 },
  { dia: 'QUARTA', rotulo: 'Quarta-feira', deslocamento: 1 },
  { dia: 'QUINTA', rotulo: 'Quinta-feira', deslocamento: 2 },
  { dia: 'SEXTA', rotulo: 'Sexta-feira', deslocamento: 3 },
  { dia: 'SEGUNDA', rotulo: 'Segunda-feira', deslocamento: 6 }
];

var DATA_RE_ = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 'yyyy-MM-dd' → Date em UTC (meia-noite). Lança erro se inválida. */
function lerData_(texto) {
  var m = DATA_RE_.exec(String(texto || ''));
  if (!m) throw new Error('Data inválida: ' + texto);
  var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) {
    throw new Error('Data inválida: ' + texto);
  }
  return d;
}

function escreverData_(d) {
  var p = function (n) { return (n < 10 ? '0' : '') + n; };
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate());
}

function somarDias_(texto, dias) {
  var d = lerData_(texto);
  d.setUTCDate(d.getUTCDate() + dias);
  return escreverData_(d);
}

/** Terça-feira que inicia o ciclo ao qual a data pertence (terça..segunda). */
function inicioDoCiclo_(texto) {
  var d = lerData_(texto);
  var recuo = (d.getUTCDay() - 2 + 7) % 7; // getUTCDay: 0=domingo, 2=terça
  return somarDias_(texto, -recuo);
}

/**
 * Ciclo a preparar a partir de hoje, como a macro antiga: a próxima terça
 * (ou hoje, se hoje for terça).
 */
function proximoCiclo_(hoje) {
  var avanco = (2 - lerData_(hoje).getUTCDay() + 7) % 7;
  return somarDias_(hoje, avanco);
}

/** Os 5 dias de almoço do ciclo que começa em `terca`: [{ data, dia, rotulo }]. */
function diasDoCiclo_(terca) {
  if (lerData_(terca).getUTCDay() !== 2) throw new Error('O ciclo deve começar numa terça-feira: ' + terca);
  return DIAS_CICLO_.map(function (d) {
    return { data: somarDias_(terca, d.deslocamento), dia: d.dia, rotulo: d.rotulo };
  });
}

/** 'yyyy-MM-dd' → 'dd/MM'. */
function dataCurta_(texto) {
  var m = DATA_RE_.exec(texto);
  return m ? m[3] + '/' + m[2] : texto;
}

function hojeTexto_() {
  return Utilities.formatDate(new Date(), FUSO_, 'yyyy-MM-dd');
}
