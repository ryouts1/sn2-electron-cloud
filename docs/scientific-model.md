# Scientific Model

## 1. 何を表示しているか

この版は `OH⁻ + CH₃Cl → CH₃OH + Cl⁻` の反応座標上で、**反応に直接関与する電子雲だけ** を表示します。

表示モードごとの意味は次の通りです。

### Reactive donor cloud

- 場の元データ: projector で切り出した occupied donor amplitude `ψ_donor(r)`
- 点の出現確率: `|ψ_donor(r)|²`
- 色: signed `ψ_donor(r)`

### Reactive acceptor cloud

- 場の元データ: projector で切り出した virtual acceptor amplitude `ψ_acceptor(r)`
- 点の出現確率: `|ψ_acceptor(r)|²`
- 色: signed `ψ_acceptor(r)`

### Reactive σ-channel density

- 場の元データ: `ρ_reactive(r)`
- 点の出現確率: `ρ_reactive(r)`
- 色: density magnitude

### Reactive Δρ flow

- 場の元データ: `Δρ_reactive(r)`
- 点の出現確率: `|Δρ_reactive(r)|`
- 色: signed `Δρ_reactive(r)`

## 2. 電子状態モデル

### 基底

- H: 1s
- C, O, Cl: 1 s + 3 p の最小 valence basis
- 各 basis function は 1 primitive Gaussian

### Hamiltonian

- diagonal: 原子軌道 onsite energy
- off-diagonal: overlap に比例する extended Hückel 型 coupling

### 解いている問題

非直交基底での一般化固有値問題を直交化して解いています。

1. overlap matrix `S`
2. orthogonalizer `X = S^{-1/2}`
3. transformed Hamiltonian `X H X`
4. 固有値・固有ベクトル
5. MO coefficient matrix `C`
6. density matrix `P`

## 3. reactive-only projector

この版の肝は、**全部の電子密度をそのまま見せない** ことです。

AO ごとに O / C / Cl の反応軸 x 方向へ重みを置いた projector を作り、

- donor 用 projector
- acceptor 用 projector
- reactive channel 用 projector

の 3 種類を使い分けています。

### donor selector

occupied 軌道の中から、

- donor projector 上の成分が大きい
- かつ HOMO 近傍にある

軌道を reactive donor として選びます。

### acceptor selector

virtual 軌道の中から、

- acceptor projector 上の成分が大きい
- かつ LUMO 近傍にある

軌道を reactive acceptor として選びます。

つまり、単純に HOMO / LUMO をそのまま出すのではなく、**SN2 の反応チャネルに沿った donor / acceptor を選び直している** ということです。

## 4. 密度と軌道の評価

### full density

`ρ(r) = Σμ Σν Pμν χμ(r) χν(r)`

### full orbital amplitude

`ψ_i(r) = Σμ Cμi χμ(r)`

### reactive projected orbital amplitude

`ψ_reactive(r) = Σμ wμ Cμi χμ(r)`

ここで `wμ` は reactive projector の AO weight です。

### reactive channel density

`ρ_reactive(r)` は、occupied 軌道の reactive projected amplitude から組み立てています。

## 5. phase color について

このプロジェクトの donor / acceptor 軌道は real-valued orbital として扱っています。したがって色が表しているのは complex phase 全体ではなく **wavefunction sign** です。

- positive lobe
- negative lobe
- node (`ψ = 0`)

を見やすくするために、中央を暗くした diverging gradient を使っています。

## 6. 何が正しくて、何が近似か

### 表示の意味として揃えていること

- donor / acceptor cloud は `|ψ|²` から点を打つ
- reactive flow は `|Δρ_reactive|` から点を打つ
- spectator H basis を projector から外している

### 近似していること

- 電子状態は extended Hückel
- reactive projector は表示目的の近似分解
- 反応経路は手組みの 1D path
- 本格的な NBO / CASSCF / DFT cube をそのまま描いているわけではない

したがって、このアプリは **反応チャネルを絞って見せるための reaction-focused visualizer** であり、研究用の厳密軌道解析器ではありません。
