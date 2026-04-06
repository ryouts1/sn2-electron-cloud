# Architecture

## 目的

この版の主目的は、`OH⁻ + CH₃Cl` の単一デモを、**複数の analogous methyl SN2 reaction preset を切り替えられる reactive-only visualizer** に拡張することです。

## レイヤー分割

### 1. chemistry layer

- `reactionPresets.js`
  - 反応プリセット定義
  - nucleophile / leaving-group / 距離パラメータ / spectator H 数を保持
- `reactionPath.js`
  - `progress` と `reactionId` から原子配置と結合描画情報を生成
  - 反応比較のためのラベルと距離メトリクスも返す
- `elements.js`
  - 元素ごとの basis / pseudo-core / 描画パラメータ
  - 電子数集計関数もここに置く

### 2. physics layer

- `gaussianBasis.js`
  - 元素定義から最小基底 AO を生成
- `extendedHuckel.js`
  - `S`, `H`, `P`, Mulliken, overlap population を計算
- `reactiveSpace.js`
  - nucleophile / carbon / leaving-group の projector を組み、reactive donor / acceptor / channel を抽出
- `sampler.js`
  - 3D グリッドへ場を評価して importance sampling 用データを作る

### 3. rendering layer

- `scene3d.js`
  - Three.js による構造描画と point cloud 表示
- `cloudSampler.js`
  - field から low-discrepancy + importance sampling で点群を生成
- `cloudTransition.js`
  - cloud morph 用の補間
- `colorMap.js`
  - 位相 / density flow / density magnitude 用の配色
- `energyDiagram.js`
  - 軌道エネルギー図の 2D 表示

### 4. worker / UI layer

- `worker/densityWorker.js`
  - 重い field solve を worker 側へ分離
- `main.js`
  - reaction selector、progress、view mode、playback、legend、metrics の制御

## 今回の設計変更点

単一反応固定版からの差分は次の 3 点です。

1. reaction preset library を追加した
2. 元素・電子数・距離を reaction-dependent にした
3. reactive projector を `O / C / Cl` 固定ではなく `nucleophile / carbon / leaving-group` 役割ベースにした

この構成にしたことで、UI を崩さずに reaction preset を増やせます。
