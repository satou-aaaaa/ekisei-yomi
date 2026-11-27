// 液性よみの問題を作る（ブラウザと node の両方で使う）。
// 中身は、消費者庁「雑貨工業品品質表示規程」二十七（合成洗剤・住宅用又は家具用の洗浄剤）の液性の区分（下の SRC。2026-11-17 に読んだ）だけ。
//   アルカリ性：pH 11.0 を超える／弱アルカリ性：11.0 以下 8.0 を超える／中性：8.0 以下 6.0 以上／弱酸性：6.0 未満 3.0 以上／酸性：3.0 未満
// 問題の pH の数は練習のための作り話（実在の商品の値ではない）。石けん（2段階だけ）・磨き剤・「まぜるな危険」は扱わない。
// 1問は、洗剤の種類と原液の pH を見て、表示する液性を選ぶ。正解したら2段目「どの側？」を選ぶ。
// 選び肢は、ほかの4つの液性から選ぶ（やさしいは3つ、ふつう・むずかしいは4つ）。
// 乱数 R は呼ぶ回数が毎回同じになるように使う（sort の比較の中では引かない）。同じ tag なら、どの端末でも同じ問題になる。
// KINDS・言い回しの並びは最後に足すだけにする（並べ替え・削除をすると過去の日の問題が変わる）。
(function (root) {
  "use strict";
  const LV = ["やさしい", "ふつう", "むずかしい"];

  // 出典（画面の「なぜ」に出す）
  const SRC = {
    caa: ["消費者庁「雑貨工業品品質表示規程」二十七 合成洗剤・住宅用又は家具用の洗浄剤（液性の区分）", "https://www.caa.go.jp/policies/policy/representation/household_goods/law/law_07/item_027.html"],
    law: ["消費者庁「家庭用品品質表示法」", "https://www.caa.go.jp/policies/policy/representation/household_goods/"],
  };

  // 答えになる5つの液性（表示の言葉）
  const CLASSES = ["酸性", "弱酸性", "中性", "弱アルカリ性", "アルカリ性"];

  // 2段目「どの側？」の3つ（表示の5つを3つにまとめる）
  const GROUPS = {
    san: { name: "酸性の側", sub: "pH 6.0 未満（酸性・弱酸性）" },
    chu: { name: "中性", sub: "pH 6.0 以上 8.0 以下" },
    alk: { name: "アルカリ性の側", sub: "pH 8.0 を超える（弱アルカリ性・アルカリ性）" },
  };
  // もう1つの分け方（強さ）。「なぜ」に出す
  const CATS = { kyo: "強い", jak: "弱い", nut: "どちらでもない" };
  // 液性ごとの決まり。答えと2段目・強さはこの表で決まる（qa/run.mjs が別に持った表でも確かめる）
  const RULE = {
    "酸性": { grp: "san", cat: "kyo", key: "pH 3.0 未満は「酸性」と表示します（雑貨工業品品質表示規程）。" },
    "弱酸性": { grp: "san", cat: "jak", key: "pH 3.0 以上 6.0 未満は「弱酸性」と表示します。3.0 ちょうどは弱酸性です。" },
    "中性": { grp: "chu", cat: "nut", key: "pH 6.0 以上 8.0 以下は「中性」と表示します。6.0 も 8.0 も中性です。" },
    "弱アルカリ性": { grp: "alk", cat: "jak", key: "pH 8.0 を超え 11.0 以下は「弱アルカリ性」と表示します。11.0 ちょうどは弱アルカリ性です。" },
    "アルカリ性": { grp: "alk", cat: "kyo", key: "pH 11.0 を超えると「アルカリ性」と表示します（雑貨工業品品質表示規程）。" },
  };

  // part:ri:begin（shared-workflows の template/parts/data/ri.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  const ri = (R, a, b) => a + Math.floor(R() * (b - a + 1));
  // part:ri:end
  // part:shuffle:begin（shared-workflows の template/parts/data/shuffle.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function shuffle(R, a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = ri(R, 0, i); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  // part:shuffle:end
  // part:pickN:begin（shared-workflows の template/parts/data/pickN.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function pickN(R, a, n) { return shuffle(R, a).slice(0, n); }
  // part:pickN:end
  const MEDIA = ["台所で", "洗面所で", "店で", "家庭科の授業で", "理科の授業で"];

  // どの液性かを当てる問題。ans：答え、sit：洗剤の言い方。選び肢は、ほかの4つの液性から（やさしいは2つ、ふつう・むずかしいは3つ）
  function which(ans, sit) {
    const near = CLASSES.filter((c) => c !== ans);
    return (R, lv) => {
      const si = ri(R, 0, sit.length - 1), mi = ri(R, 0, MEDIA.length - 1);
      const n = lv === 0 ? 2 : 3, ds = pickN(R, near, n);
      const q = sit[si] + "　表示する液性は？";
      return { type: "act", media: MEDIA[mi], q, opts: shuffle(R, [ans, ...ds]), ans, rev: false, v: `${si}:${mi}` };
    };
  }
  // 言い方（「%」に pH の数が入る）× pH の数 → 問いの文
  const sits = (phr, phs) => phr.flatMap((p) => phs.map((v) => p.split("%").join(v.toFixed(1))));
  // 1つの種類（洗剤）を作る。grp・cat・key は液性の決まり RULE から。ph は問いに出す pH の数
  function K(id, lv, ans, name, look, why, phr, ph) {
    const r = RULE[ans];
    return { id, lv, grp: r.grp, cat: r.cat, ans, name, src: ["caa", "law"], look, key: r.key, why, ph, make: which(ans, sits(phr, ph)) };
  }
  const W = () => "（雑貨工業品品質表示規程）";

  const KINDS = [
    // ---- やさしい（区切りから遠い数） ----
    K("toire", 0, "酸性", "トイレ用の洗浄剤", "pH の数がとても小さい洗剤です。",
      "pH 3.0 未満なので「酸性」です" + W() + "。数が小さいほど、酸の性質が強くなります。",
      ["トイレ用の住宅用洗浄剤。原液の pH は %。", "便器の汚れを落とす住宅用洗浄剤。原液の pH は %。", "トイレそうじの液体の洗浄剤。原液の pH は %。"], [1.0, 1.5, 2.0, 2.5]),
    K("shokki", 0, "中性", "台所用の合成洗剤", "pH 7 の近くの洗剤です。",
      "pH 6.0 以上 8.0 以下なので「中性」です" + W() + "。",
      ["食器を洗う台所用の合成洗剤。原液の pH は %。", "台所のスポンジにつける合成洗剤。原液の pH は %。", "台所用の液体の合成洗剤。原液の pH は %。"], [6.5, 7.0, 7.2, 7.5]),
    K("sentaku", 0, "弱アルカリ性", "洗たく用の合成洗剤", "pH 8.0 より大きく、11.0 より小さい洗剤です。",
      "pH 8.0 を超え 11.0 以下なので「弱アルカリ性」です" + W() + "。",
      ["洗たく用の液体の合成洗剤。原液の pH は %。", "洗たく機で使う合成洗剤。原液の pH は %。", "シャツを洗う洗たく用の合成洗剤。原液の pH は %。"], [9.0, 9.5, 10.0, 10.5]),
    K("paipu", 0, "アルカリ性", "パイプ用の洗浄剤", "pH の数がとても大きい洗剤です。",
      "pH 11.0 を超えるので「アルカリ性」です" + W() + "。数が大きいほど、アルカリの性質が強くなります。",
      ["排水パイプのつまりをとる住宅用洗浄剤。原液の pH は %。", "台所の排水口のパイプ用洗浄剤。原液の pH は %。", "パイプ用の液体の洗浄剤。原液の pH は %。"], [12.0, 12.5, 13.0, 13.5]),
    K("furo", 0, "弱酸性", "おふろ用の洗浄剤", "pH 3.0 より大きく、6.0 より小さい洗剤です。",
      "pH 3.0 以上 6.0 未満なので「弱酸性」です" + W() + "。",
      ["おふろ用の住宅用洗浄剤。原液の pH は %。", "浴そうを洗う住宅用洗浄剤。原液の pH は %。", "おふろの鏡をみがく住宅用洗浄剤（研磨材なし）。原液の pH は %。"], [4.0, 4.5, 5.0, 5.5]),
    // ---- ふつう（区切りの近くの数） ----
    K("mizuaka", 1, "酸性", "水あか落としの洗浄剤", "3.0 より小さいか、大きいかを見ます。",
      "3.0 より小さければ「酸性」です" + W() + "。2.9 でも、3.0 未満なので酸性です。",
      ["水あか落としの住宅用洗浄剤。原液の pH は %。", "蛇口の水あかを落とす住宅用洗浄剤。原液の pH は %。", "洗面台の水あか用の住宅用洗浄剤。原液の pH は %。"], [2.6, 2.7, 2.8, 2.9]),
    K("oshare", 1, "弱酸性", "おしゃれ着用の合成洗剤", "3.0 から 6.0 のあいだかを見ます。",
      "pH 3.0 以上 6.0 未満は「弱酸性」です" + W() + "。5.9 は 6.0 未満なので、中性ではありません。",
      ["おしゃれ着用の洗たく用合成洗剤。原液の pH は %。", "セーターを手洗いする合成洗剤。原液の pH は %。", "ウールを洗う洗たく用合成洗剤。原液の pH は %。"], [3.1, 3.3, 5.8, 5.9]),
    K("tehada", 1, "中性", "手洗い用の台所用合成洗剤", "6.0 から 8.0 のあいだかを見ます。",
      "pH 6.0 以上 8.0 以下は「中性」です" + W() + "。7 ぴったりでなくても中性と表示します。",
      ["台所用の合成洗剤（食器の手洗い用）。原液の pH は %。", "なべを洗う台所用の合成洗剤。原液の pH は %。", "コップを洗う台所用の合成洗剤。原液の pH は %。"], [6.1, 6.3, 7.8, 7.9]),
    K("yuka", 1, "弱アルカリ性", "床そうじの洗浄剤", "8.0 から 11.0 のあいだかを見ます。",
      "pH 8.0 を超え 11.0 以下は「弱アルカリ性」です" + W() + "。8.1 は 8.0 を超えるので、中性ではありません。",
      ["床そうじの住宅用洗浄剤。原液の pH は %。", "フローリングをふく住宅用洗浄剤。原液の pH は %。", "家具をふく家具用の洗浄剤。原液の pH は %。"], [8.1, 8.4, 10.8, 10.9]),
    K("kankisen", 1, "アルカリ性", "換気扇用の洗浄剤", "11.0 より大きいかを見ます。",
      "pH 11.0 を超えると「アルカリ性」です" + W() + "。11.1 でも 11.0 を超えるので、アルカリ性です。",
      ["換気扇の油汚れを落とす住宅用洗浄剤。原液の pH は %。", "コンロまわりの油汚れ用の住宅用洗浄剤。原液の pH は %。", "レンジフードを洗う住宅用洗浄剤。原液の pH は %。"], [11.1, 11.3, 11.6, 11.9]),
    // ---- むずかしい（区切りちょうど・粉の洗剤） ----
    K("b30", 2, "弱酸性", "pH 3.0 ちょうどの洗浄剤", "3.0 は「以上」に入るか「未満」に入るか。",
      "弱酸性は「6.0 未満 3.0 以上」です" + W() + "。3.0 ちょうどは「3.0 以上」に入るので、酸性ではなく弱酸性です。",
      ["トイレ用の住宅用洗浄剤。原液の pH は、ちょうど %。", "水あか落としの住宅用洗浄剤。原液の pH は、ちょうど %。", "おふろ用の住宅用洗浄剤。原液の pH は、ちょうど %。", "洗面台用の住宅用洗浄剤。原液の pH は、ちょうど %。"], [3.0]),
    K("b60", 2, "中性", "pH 6.0 ちょうどの洗剤", "6.0 は「以上」に入るか「未満」に入るか。",
      "中性は「8.0 以下 6.0 以上」です" + W() + "。6.0 ちょうどは「6.0 以上」に入るので、弱酸性ではなく中性です。",
      ["台所用の合成洗剤。原液の pH は、ちょうど %。", "おしゃれ着用の洗たく用合成洗剤。原液の pH は、ちょうど %。", "おふろ用の住宅用洗浄剤。原液の pH は、ちょうど %。", "食器を洗う合成洗剤。原液の pH は、ちょうど %。"], [6.0]),
    K("b80", 2, "中性", "pH 8.0 ちょうどの洗剤", "8.0 は「以下」に入るか「超える」に入るか。",
      "中性は「8.0 以下 6.0 以上」です" + W() + "。8.0 ちょうどは「8.0 以下」に入るので、弱アルカリ性ではなく中性です。",
      ["洗たく用の合成洗剤。原液の pH は、ちょうど %。", "床そうじの住宅用洗浄剤。原液の pH は、ちょうど %。", "台所用の合成洗剤。原液の pH は、ちょうど %。", "家具用の洗浄剤。原液の pH は、ちょうど %。"], [8.0]),
    K("b110", 2, "弱アルカリ性", "pH 11.0 ちょうどの洗剤", "11.0 は「以下」に入るか「超える」に入るか。",
      "弱アルカリ性は「11.0 以下 8.0 を超える」です" + W() + "。11.0 ちょうどは「11.0 以下」に入るので、アルカリ性ではなく弱アルカリ性です。",
      ["換気扇用の住宅用洗浄剤。原液の pH は、ちょうど %。", "洗たく用の合成洗剤。原液の pH は、ちょうど %。", "床そうじの住宅用洗浄剤。原液の pH は、ちょうど %。", "コンロまわりの住宅用洗浄剤。原液の pH は、ちょうど %。"], [11.0]),
    K("kona", 2, "弱アルカリ性", "粉の洗たく用合成洗剤", "粉の洗剤は、使う量を水に溶かした液ではかります。",
      "粉の合成洗剤は、使う量を水に溶かした液の pH ではかります" + W() + "。8.0 を超え 11.0 以下なので「弱アルカリ性」です。",
      ["粉の洗たく用合成洗剤。使う量を水に溶かした液の pH は %。", "粉の合成洗剤を、使う量だけ水に溶かした。その液の pH は %。", "洗たく用の粉の合成洗剤。使う量で溶かした液の pH は %。"], [9.2, 9.8, 10.4, 11.0]),
  ];
  const BY = Object.fromEntries(KINDS.map((k) => [k.id, k]));
  const kindsOf = (lv) => KINDS.filter((k) => k.lv === lv).map((k) => k.id);

  // part:seedOf:begin（shared-workflows の template/parts/data/seedOf.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  // part:seedOf:end
  // part:rng:begin（shared-workflows の template/parts/data/rng.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // part:rng:end

  // 1問を作る。tag は「種類|種」（例 "toire|2026-11-18:d0"）。同じ tag ならいつも同じ問題
  function make(tag) {
    const [kind] = String(tag).split("|"), k = BY[kind];
    if (!k) return null;
    const p = k.make(rng(seedOf(tag)), k.lv);
    return { tag, kind, lv: k.lv, name: k.name, look: k.look, key: k.key, why: k.why, grp: k.grp, cat: k.cat, src: k.src.map((s) => SRC[s]), ...p };
  }
  const keyOf = (P) => `${P.kind}:${P.q}:${P.opts.slice().sort().join("/")}`;

  // 今日の5問（やさしい2・ふつう2・むずかしい1）。種類は重ねない
  function dailyTags(date) {
    const R = rng(seedOf("day:" + date)), e = pickN(R, kindsOf(0), 2), n = pickN(R, kindsOf(1), 2), h = pickN(R, kindsOf(2), 1);
    return [...e, ...n, ...h].map((id, i) => `${id}|${date}:d${i}`);
  }
  // 上級の3問（むずかしいだけ・今日の5問のむずかしいとは別の種類）
  function hardTags(date) {
    const dh = dailyTags(date)[4].split("|")[0], R = rng(seedOf("hard:" + date)), h = pickN(R, kindsOf(2).filter((x) => x !== dh), 3);
    return h.map((id, i) => `${id}|${date}:h${i}`);
  }

  const EKY = { KINDS, BY, GROUPS, CATS, RULE, LV, SRC, CLASSES, kindsOf, seedOf, rng, make, keyOf, dailyTags, hardTags, pickN };
  if (typeof module !== "undefined" && module.exports) module.exports = EKY; else root.EKY = EKY;
})(typeof self !== "undefined" ? self : this);
