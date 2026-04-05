# Test Plan

## 1. 数値モデルの確認

### Gaussian 基底

- self-overlap が 1 に近いこと
- basis function 数が想定通りであること

### 反応幾何

- reactant / TS / product の距離が意図通り変化すること
- 炭素反転の向きが反応座標で反転すること

### 電子数

- `Tr(PS)` が 22 に一致すること
- Mulliken 電荷総和が `-1` に一致すること

### 化学的な指標

- O–C overlap population が反応とともに増えること
- C–Cl overlap population が反応とともに減ること

## 2. reactive display model の確認

### selector

- reactant / TS / product で donor / acceptor selector が意図した軌道を選ぶこと
- donor は occupied、acceptor は virtual から選ばれること

### projector

- donor / channel projector が H spectator basis に重みを持たないこと
- reactive channel electron count が全 22 電子よりかなり小さいこと

### reactive field integral

- reactive donor / acceptor probability の積分が概ね 1 に近いこと
- reactive channel density の積分が数電子程度に収まること

## 3. sampler の確認

### RNG

- fixed seed で deterministic に動くこと

### point cloud boundary

- sampler が境界から極端に外れた点を返さないこと
- flat index から x / y / z index への復元が正しいこと

## 4. 手動確認

ブラウザでは次を確認する。

1. 初期表示が `Reactive donor cloud` で立ち上がる
2. Play で反応座標が進み、雲が更新される
3. cloud refresh を 10 Hz 以上にすると雲が静止画ではなく揺らぐ
4. donor / acceptor で yellow / magenta の phase gradient が見える
5. `Reactive Δρ flow` で gain / loss の色分けが見える
6. spectator H 原子・C–H 結合が reactive center より控えめに見える
7. PNG export が動く
8. `python3 -m http.server 8000` で起動できる
