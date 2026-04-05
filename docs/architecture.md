# Architecture

## 目的

この版の主目的は、`OH⁻ + CH₃Cl → CH₃OH + Cl⁻` を題材にした 3D 電子雲表示を、**reaction-related cloud only** に寄せることです。

つまり、見た目の派手さよりも

- donor lone pair
- acceptor `σ*`
- O–C–Cl 反応チャネル内の density flow

を UI 上で明確に切り出すことを優先しています。

## レイヤー構成

### 1. chemistry

- `reactionPath.js`
- `elements.js`

反応幾何と元素パラメータを持つ層です。SN2 の座標、結合長、炭素反転、reactive / spectator の見せ分けはここに閉じています。

### 2. math

- `matrix.js`
- `numerics.js`

一般化固有値問題、直交化、補助的な数値関数を持つ層です。

### 3. physics

- `gaussianBasis.js`
- `extendedHuckel.js`
- `reactiveSpace.js`
- `sampler.js`

電子状態モデルを扱う層です。

- AO を作る
- overlap を作る
- extended Hückel Hamiltonian を作る
- MO / density matrix を求める
- reactive donor / acceptor / channel projector を定義する
- `ρ_reactive(r)`, `Δρ_reactive(r)`, `ψ_reactive(r)` を 3D グリッド上で評価する

### 4. worker

- `densityWorker.js`

重い場の再計算を worker に逃がしています。ここでは grid evaluation と field packaging を担当します。

### 5. render

- `scene3d.js`
- `cloudSampler.js`
- `colorMap.js`
- `energyDiagram.js`

描画専用の層です。

- `scene3d.js` は Three.js のシーンと point cloud の描画
- `cloudSampler.js` は grid field を確率点群へ変換
- `colorMap.js` は phase / density-flow 用の配色
- `energyDiagram.js` は donor / acceptor を強調した 2D の MO ラダー

### 6. main

- `main.js`

UI 状態、worker 通信、再サンプリング、再生制御をまとめています。

## 今回の重要な分離点

### full electronic model と reactive display model を分離した

電子状態自体は full valence basis で解いていますが、表示はそこからさらに reactive projector を通しています。

これにより、

- 計算モデルは壊さずに残せる
- UI では spectator density を外せる
- donor / acceptor の定義をあとで差し替えやすい

という利点があります。

### field evaluation と cloud rendering を分離した

まず worker で `|ψ|²` や `ρ_reactive(r)` を格子上に作り、その後 main thread 側で点群へ再サンプリングします。

これにより:

- 反応座標を変えない限り重い再計算を避けられる
- 同じ分布から何度でも stochastic resampling できる
- 「揺らぐ雲」の見た目を、物理モデルと描画ロジックを混ぜずに実装できる

### reactive mode ごとに sampling rule を分けた

- `reactive-donor`: weight = `|ψ_donor|²`, color = signed `ψ_donor`
- `reactive-acceptor`: weight = `|ψ_acceptor|²`, color = signed `ψ_acceptor`
- `reactive-flow`: weight = `|Δρ_reactive|`, color = signed `Δρ_reactive`
- `reactive-channel`: weight = `ρ_reactive`, color = density magnitude

この設計により、「何を確率として点にしているか」をビューごとに明示できます。

## 点群表示を続ける理由

今回の要求は「反応に関係する電子雲だけを動画的に見せる」ことなので、表示の主役は isosurface ではなく point cloud のままにしています。

点群の方が、

- 確率が高い場所に粒子が集まる
- 再サンプリングで動画っぽい雲の揺らぎを出せる
- donor / acceptor の phase sign を自然に載せやすい

という利点があるためです。
