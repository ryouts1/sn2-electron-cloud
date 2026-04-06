# Test Plan

## 方針

見た目のアプリだが、表示の前提になっている数値部分を先に確認する。

## 確認項目

### reaction preset / geometry

- preset library が複数件あること
- 各 preset で reactant / TS / product 距離が設定どおりになること
- methyl inversion の符号が反応座標で反転すること
- nucleophile-side hydrogen 数が preset と一致すること

### basis / electronic structure

- 代表 preset の basis function 数が期待どおりであること
- 各 basis function の自己 overlap が 1 であること
- `Tr(PS) = 22` が保たれること
- Mulliken 電荷総和が `-1` に戻ること
- 反応物→生成物で `Nu–C` と `C–LG` の overlap population が入れ替わること

### reactive-only extraction

- reactive donor は occupied、acceptor は virtual から選ばれること
- H spectator basis に重みが入っていないこと
- donor / acceptor cloud が概ね規格化されること
- reactive channel が全 22 電子の一部だけを拾っていること

### rendering support

- valence density の積分が 22 電子へ戻ること
- reactive flow が大きく破綻しないこと
- cloud sampler / cloud transition が壊れていないこと
