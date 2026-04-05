# SN2 3D Electron Cloud Simulator

`OH⁻ + CH₃Cl → CH₃OH + Cl⁻` の SN2 反応を題材に、反応座標に沿った 3D 電子雲をブラウザで可視化するアプリです。

今回は「それっぽい電子アニメ」ではなく、各反応座標ごとに実際に価電子密度を計算してから表示しています。内部では、最小基底 Gaussian AO・重なり行列 `S`・extended Hückel 型 Hamiltonian `H`・密度行列 `P` を組み、

`ρ(r) = Σμ Σν Pμν χμ(r) χν(r)`

を 3D グリッド上で評価しています。

## 何を作ったか

このプロジェクトは、`OH⁻ + CH₃Cl → CH₃OH + Cl⁻` の反応経路を 1 次元の reaction coordinate `q ∈ [0, 1]` で表し、各 `q` に対して次を行います。

1. SN2 らしい幾何を生成する
2. H / C / O / Cl 上に最小基底 AO を置く
3. AO 重なり行列 `S` を解析的に計算する
4. extended Hückel 近似で `H` を組む
5. 一般化固有値問題を解いて MO 係数を得る
6. 密度行列 `P` を作る
7. `ρ(r)` や HOMO/LUMO 振幅を 3D グリッドで評価する
8. Marching Cubes で 3D 等値面として表示する

## 主な機能

- SN2 反応座標スライダー
- 3D valence density isosurface
- pseudo-core を加えた total density 表示
- `Δρ(r)`（反応物基準の差分密度）
- HOMO / LUMO phase surface
- O···C / C···Cl 距離、Mulliken 電荷、overlap population の表示
- orbital energy ladder
- Web Worker でのグリッド評価

## この作品で見せたいこと

- 題材と計算モデルが一致していること
- 3D ビジュアライザーの中身に `S`, `H`, `C`, `P` があること
- 「どこまで計算していて、どこから近似か」を曖昧にしないこと
- 小さなテーマでも README / docs / tests まで整理すること

## 技術構成

- JavaScript (ES Modules)
- Three.js
- Marching Cubes
- Web Worker
- Node built-in test runner

## 実行方法

```bash
cd sn2-reaction-electron-cloud-simulator
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
- 3D グリッド積分で valence density が 22 電子に近いこと
- `Δρ` の空間積分が概ね 0 に近いこと

## ディレクトリ構成

```text
sn2-reaction-electron-cloud-simulator/
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
│  │  └─ sampler.js
│  ├─ render/
│  │  ├─ scene3d.js
│  │  └─ energyDiagram.js
│  ├─ worker/
│  │  └─ densityWorker.js
│  ├─ main.js
│  └─ styles.css
└─ tests/
   ├─ gaussianBasis.test.js
   ├─ reactionPath.test.js
   ├─ extendedHuckel.test.js
   └─ sampler.test.js
```

## 何を計算していて、何を近似しているか

### 計算しているもの

- AO 値と AO 重なり積分
- 非直交基底の一般化固有値問題
- 22 個の価電子を持つ密度行列
- `ρ(r)` の 3D グリッド評価
- Mulliken charge / overlap population

### 近似しているもの

- Hamiltonian は extended Hückel
- 基底は最小基底の 1 primitive Gaussian
- 反応経路は事前定義の 1D path
- all-electron 密度ではなく、主計算は価電子密度
- pseudo-core は見た目用の補助密度

つまり、**反応系そのものを題材にした計算ベースの可視化**ではあるが、**ab initio / DFT の定量予測器ではない**という立ち位置です。

## 見どころ

### Valence density

反応中心を含む価電子雲そのものを見ます。まず題材に対して名前負けしていないビューです。

### Δρ vs reactants

電子再配分を見るなら一番分かりやすいビューです。O 側の gain と C–Cl 側の loss が反応座標に沿って動きます。

### HOMO / LUMO phase

符号付き等値面にしてあるので、SN2 軸に沿った位相構造や節面が見えます。

## 設計上の工夫

1. 描画より先に計算モデルを置いた
2. 反応の見どころが出るように `density` だけでなく `Δρ` と frontier orbital も用意した
3. 3D グリッド評価は Worker に逃がして UI を固めにくくした
4. 近似の限界を README と UI の両方で明示した

## 既知の制約

- 反応障壁や実験電子密度の定量再現を狙うモデルではない
- basis が小さいので密度の細部は粗い
- pseudo-core は見た目用の近似であり多電子コア計算ではない
- 反応経路は最適化済み IRC ではない

## 今後の改善案

- contracted Gaussian への拡張
- 任意 MO の選択表示
- 反応ごとの JSON 定義対応
- 等値面の PNG / GLTF 書き出し
- IRC や外部幾何データの読込対応
