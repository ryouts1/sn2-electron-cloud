# Architecture

## 全体方針

このリポジトリでは、SN2 反応の 3D 電子雲表示を次の責務に分けています。

1. 反応経路を生成する
2. 基底関数と電子構造を計算する
3. 実空間グリッドへ射影する
4. 3D 等値面として描画する

UI は `main.js` が受け持ちますが、化学モデルと描画は分離しています。

## モジュール分割

### `src/chemistry/`

- `reactionPath.js`
  - `q ∈ [0,1]` に対する原子配置を返す
  - O···C 形成、C···Cl 切断、CH₃ の umbrella inversion をまとめて扱う
- `elements.js`
  - 元素色、表示半径、価電子数、Gaussian パラメータ、pseudo-core 設定

### `src/math/`

- `matrix.js`
  - 行列積、転置、対称直交化、Jacobi 固有値法
- `numerics.js`
  - `smoothstep`, `percentile`, `linspace`

### `src/physics/`

- `gaussianBasis.js`
  - s / p Cartesian Gaussian の正規化
  - AO 値評価
  - AO 間 overlap integral
- `extendedHuckel.js`
  - overlap matrix `S`
  - Hamiltonian `H`
  - generalized eigenproblem の解法
  - density matrix / Mulliken charge / overlap population
- `sampler.js`
  - `ρ(r)` や HOMO/LUMO 振幅の 3D グリッド評価
  - pseudo-core 密度の加算
  - isovalue の統計量算出

### `src/worker/`

- `densityWorker.js`
  - reaction coordinate ごとの電子構造計算と 3D field sampling を実行
  - main thread を描画専用に寄せる

### `src/render/`

- `scene3d.js`
  - Three.js scene
  - atoms / bonds / marching cubes 等値面
- `energyDiagram.js`
  - 軌道エネルギーの 2D ladder 表示

## データフロー

1. UI が `progress`, `view`, `resolution` を更新
2. `main.js` が Worker に request を送る
3. Worker が `reactionPath → basis → Hückel → density sampling` を実行
4. main thread が等値面・エネルギー図・電荷表を更新

## 設計上の意図

### 1. `scene3d.js` を計算コードから切り離した

描画側は field array を受け取って表示するだけです。
分子軌道計算の詳細を UI コンポーネントに混ぜないようにしています。

### 2. Worker を先に置いた

reaction coordinate を動かすたびに 3D field を再計算するので、main thread で処理すると回転操作が重くなります。
そのため、密度評価は Worker 側で完結させています。

### 3. 計算モデルは小さくても説明できる粒度にした

大規模な量子化学コードより、

- basis をどう置くか
- `S` と `H` をどう作るか
- `ρ(r)` をどう描くか

が面接で説明しやすい構成を優先しています。
