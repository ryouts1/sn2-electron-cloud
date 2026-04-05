# SN2 Reactive Probability Cloud Simulator

`OH⁻ + CH₃Cl → CH₃OH + Cl⁻` の SN2 反応を題材に、**反応に直接関与する電子雲だけ** を 3D の確率点群で表示するブラウザアプリです。

この版では、全電子密度や spectator な C–H / O–H 電子雲を見せるのではなく、**donor lone pair / acceptor σ* / O–C–Cl 反応チャネルの密度移動** に表示を絞っています。

## 何が変わったか

前の版は HOMO / LUMO / total density も選べましたが、この版の UI は **reaction-related cloud only** に寄せています。

- **Reactive donor cloud**  
  O 側から炭素へ供与する occupied donor 成分だけを `|ψ|²` の確率雲で表示
- **Reactive acceptor cloud**  
  backside attack を受ける virtual acceptor `σ*` 成分だけを `|ψ|²` の確率雲で表示
- **Reactive Δρ flow**  
  反応物基準で、反応チャネル内の電子がどこから減り、どこへ増えるかだけを表示
- **Reactive σ-channel density**  
  O / C / Cl の x 軸方向反応チャネルに投影した密度だけを表示

## reactive-only の定義

このアプリでいう「反応に関係する電子雲」は、厳密な NBO 解析そのものではありません。以下の projector ベース定義を使っています。

1. まず通常どおり extended Hückel + 最小 Gaussian 基底で MO を求める
2. その上で、O / C / Cl の **反応軸 x 方向の σ チャネル** に重みを持つ AO projector を作る
3. occupied 側では、HOMO 近傍でその projector 成分が最も大きい軌道を **reactive donor** として選ぶ
4. virtual 側では、LUMO 近傍でその projector 成分が最も大きい軌道を **reactive acceptor** として選ぶ
5. reactive channel density / flow では、その projector に入る AO 成分だけで密度を再評価する

つまり、**見せたい反応チャネルを UI 上で明示的に抽出する** ための表示です。

## 計算モデル

1. `progress ∈ [0, 1]` から SN2 反応幾何を生成
2. H / C / O / Cl に最小基底 Gaussian AO を配置
3. overlap 行列 `S` を解析的に計算
4. extended Hückel 型 Hamiltonian `H` を構成
5. 一般化固有値問題を解いて MO を得る
6. 密度行列 `P` を構成
7. donor / acceptor / reactive channel の projector を組む
8. `|ψ_reactive|²`, `ρ_reactive(r)`, `Δρ_reactive(r)` を 3D グリッド上で評価
9. importance sampling で point cloud を生成

## 表示モード

### Reactive donor cloud

- 場の元データ: 正規化した reactive donor amplitude `ψ_donor(r)`
- 点の出現確率: `|ψ_donor(r)|²`
- 色: signed `ψ_donor(r)`

### Reactive acceptor cloud

- 場の元データ: 正規化した reactive acceptor amplitude `ψ_acceptor(r)`
- 点の出現確率: `|ψ_acceptor(r)|²`
- 色: signed `ψ_acceptor(r)`

### Reactive Δρ flow

- 場の元データ: `Δρ_reactive(r) = ρ_reactive,current(r) - ρ_reactive,reactants(r)`
- 点の出現確率: `|Δρ_reactive(r)|`
- 色: density gain / loss

### Reactive σ-channel density

- 場の元データ: `ρ_reactive(r)`
- 点の出現確率: `ρ_reactive(r)`
- 色: density magnitude

## 何が正しく、何が近似か

### この版で揃えていること

- donor / acceptor cloud は `|ψ|²` に基づく probability cloud
- density flow は `|Δρ|` で点を打ち、符号は色で分ける
- spectator H basis は reactive projector から外している
- UI では reaction-related view だけを出している

### 近似であること

- 電子状態モデルは extended Hückel
- AO projector による reactive 定義は表示用の近似分解
- 反応経路は手組みの 1D path
- ab initio / DFT cube を直接描いているわけではない

## 実行方法

```bash
cd sn2-reactive-probability-cloud-simulator
python3 -m http.server 8000
```

ブラウザで次を開きます。

```text
http://localhost:8000
```

## テスト

```bash
npm test
```

確認している内容:

- Gaussian 基底の正規化
- 反応経路の幾何整合性
- `Tr(PS) = 22` による価電子数保存
- Mulliken 電荷総和が `-1`
- O–C 形成 / C–Cl 切断の overlap population 変化
- reactive donor / acceptor selector の追跡
- reactive donor / acceptor probability の概略正規化
- reactive projector が H spectator basis を無視すること
- reactive channel 電子数が妥当な範囲に入ること
- cloud sampler / cloud morph の整合性

## ディレクトリ構成

```text
sn2-reactive-probability-cloud-simulator/
├─ index.html
├─ package.json
├─ README.md
├─ .gitignore
├─ docs/
│  ├─ architecture.md
│  ├─ scientific-model.md
│  ├─ interview-notes.md
│  └─ test-plan.md
├─ src/
│  ├─ chemistry/
│  │  ├─ elements.js
│  │  └─ reactionPath.js
│  ├─ math/
│  │  ├─ matrix.js
│  │  └─ numerics.js
│  ├─ physics/
│  │  ├─ gaussianBasis.js
│  │  ├─ extendedHuckel.js
│  │  ├─ reactiveSpace.js
│  │  └─ sampler.js
│  ├─ render/
│  │  ├─ colorMap.js
│  │  ├─ cloudSampler.js
│  │  ├─ cloudTransition.js
│  │  ├─ scene3d.js
│  │  └─ energyDiagram.js
│  ├─ worker/
│  │  └─ densityWorker.js
│  ├─ main.js
│  └─ styles.css
└─ tests/
   ├─ cloudSampler.test.js
   ├─ cloudTransition.test.js
   ├─ gaussianBasis.test.js
   ├─ reactionPath.test.js
   ├─ extendedHuckel.test.js
   ├─ reactiveSpace.test.js
   └─ sampler.test.js
```

## 次に伸ばすなら

- ORCA / Gaussian / Psi4 の cube file を読み込んで同じ UI に乗せる
- reactive orbital の固定追跡ではなく、状態追跡と local diabatization を入れる
- slice plane と point inspection を追加する
- donor / acceptor の projector 定義を UI で切り替えられるようにする
