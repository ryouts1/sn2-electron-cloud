# Scientific model

## Target reaction

このプロジェクトの題材は

`OH⁻ + CH₃Cl → CH₃OH + Cl⁻`

です。

表示対象は、この反応の 1 次元 reaction coordinate に沿った 3D 電子雲です。

## What is computed at each reaction coordinate

各 `q ∈ [0,1]` に対して次を行っています。

1. 原子配置 `R(q)` を定義
2. 価電子 AO 基底を作る
3. overlap matrix `S` を解析的に計算
4. extended-Hückel 型 Hamiltonian `H` を作る
5. `Hc = S cε` を解いて MO を得る
6. 22 個の価電子を下位軌道から充填する
7. density matrix `D` を作る
8. 3D 空間点 `r` に対して `ρ(r)` を評価する

## AO basis

使っている基底は 1 primitive の Cartesian Gaussian です。

- H: `1s`
- C: `2s, 2p_x, 2p_y, 2p_z`
- O: `2s, 2p_x, 2p_y, 2p_z`
- Cl: `3s, 3p_x, 3p_y, 3p_z`

合計 16 基底です。

## One-electron density

表示している価電子密度は

`ρ(r) = Σμ Σν Dμν φμ(r) φν(r)`

です。

ここで

- `φμ(r)` は AO
- `Dμν` は occupied MO から作った density matrix

です。

## Display modes

### `valence-density`

価電子密度 `ρ(r)` の isosurface です。

### `total-density`

`ρ(r)` に加えて、表示目的の pseudo-core density を足しています。
これは「全電子を厳密に再計算した」という意味ではなく、原子核近傍の見え方を補うための簡易項です。

### `delta-density`

反応物側 `q = 0` を基準にした差分

`Δρ(r) = ρ_current(r) - ρ_reactants(r)`

です。

### `homo-phase` / `lumo-phase`

HOMO / LUMO の MO 振幅

`ψ_i(r) = Σμ Cμi φμ(r)`

を表示します。正負の位相を別 surface に分けています。

## Reaction coordinate model

反応座標は 1D の手定義パスです。

- O···C 距離: 反応物側では長く、生成物側で短くする
- C···Cl 距離: 反応物側では短く、生成物側で長くする
- CH₃ の umbrella inversion: TS 近傍で平面化し、生成物側で反転を完了させる

そのため、SN2 の「backside attack と立体反転」は見えるようにしています。

## What the model is good for

- 反応中心の電子雲の 3D 変化を見る
- total density だけでは見えにくい電子再配分を `delta-density` で追う
- O–C 形成と C–Cl 切断を overlap population で確認する
- HOMO/LUMO の位相面で反応中心の向きを見る

## What the model does not claim

このプロジェクトは次のものではありません。

- DFT
- Hartree–Fock
- basis set convergence を議論する量子化学計算
- 実験電子密度の再現
- 最適化済み IRC

したがって、値の読み取りは**定性的**です。

## Why this is still a valid portfolio project

- 反応名と表示対象が一致している
- 3D 表示が、計算済み field に基づいている
- 近似モデルの境界を README と docs に明示している

この 3 点があるので、「派手なだけの可視化」より説明しやすい構成になっています。
