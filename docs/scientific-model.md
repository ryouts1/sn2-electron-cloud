# Scientific Model

## 何を計算しているか

この版は、複数の methyl SN2 reaction preset に対して、**反応に直接関与する電子雲だけ** を抽出して表示します。

計算の流れは次のとおりです。

1. reaction preset と progress から SN2 反応幾何を生成
2. 最小基底 Gaussian AO を配置
3. overlap 行列 `S` を解析的に計算
4. extended Hückel 型 Hamiltonian `H` を構成
5. 一般化固有値問題 `Hc = Scε` を解く
6. 密度行列 `P` を構成
7. reactive projector で donor / acceptor / channel を抽出
8. `|ψ|²`, `ρ`, `Δρ` を 3D グリッド上で評価
9. point cloud sampling で可視化する

## reactive-only の定義

projector は `nucleophile`, `carbon`, `leaving-group` の役割で作る。

- donor
  - nucleophile `s`, `px` を強く重みづけ
- acceptor
  - carbon `s`, `px` と leaving-group `s`, `px` を強く重みづけ
- channel
  - nucleophile / carbon / leaving-group の x 軸方向 σ チャネルを拾う

したがって、`O / C / Cl` 固定ではなく、`OH⁻`, `HS⁻`, `NH₂⁻`, `Cl⁻` のような別の nucleophile へ同じ表示ロジックを適用できます。

## この版の限界

- ab initio / DFT ではなく extended Hückel 近似
- 反応経路は手組みの 1D path
- donor / acceptor 分解は projector ベースの表示用近似
- 反応障壁や速度定数の定量予測はしない

## それでも意味がある点

- `|ψ|²` を probability cloud として扱う意味づけが揃っている
- 反応に関係する軌道だけを見る UI になっている
- 同種反応で nucleophile / leaving-group を変えたときの donor / acceptor の見た目比較ができる
