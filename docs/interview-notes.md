# Interview notes

## 何を作ったか

`OH⁻ + CH₃Cl → CH₃OH + Cl⁻` の SN2 反応について、
反応座標に沿って 3D 電子雲を表示するブラウザシミュレーターです。

表示モードは

- valence density
- total density
- difference density
- HOMO phase
- LUMO phase

を用意しています。

## 前回から何を直したか

前の方向だと「電子雲ビジュアライザー」と言いながら、実質的には題材が水素原子寄りでした。
今回はそこを修正して、最初の題材だった SN2 反応そのものに戻しています。

つまり、今回の作品では

- 題材: SN2 反応
- 反応物: `OH⁻ + CH₃Cl`
- 生成物: `CH₃OH + Cl⁻`
- 表示対象: その反応座標に沿った 3D field

で統一しています。

## どこが「ちゃんと計算」なのか

最低限ここまでは式でやっています。

- AO overlap
- generalized eigenproblem
- density matrix
- Mulliken charge
- overlap population
- 3D grid 上の field evaluation

なので、単に 3D モデルを morph しているわけではありません。

## どこを近似しているのか

- minimal basis
- extended-Hückel
- pseudo-core density は display 用
- reaction path は手定義

ここは README と docs に明記しています。

## 技術的な見どころ

### 1. 3D field を isosurface 化している

ただの点群ではなく、3D グリッドを評価して Marching Cubes で面にしています。
そのため、反応中心の雲のつながり方が見やすいです。

### 2. 反応の変化が埋もれないように表示モードを分けた

total density だけだと反応の差が見えにくいので、
`delta-density` と `HOMO/LUMO phase` も用意しています。

### 3. main thread と worker を分離している

3D 表示は Three.js、計算は Worker 側に寄せています。
UI の操作感を落としにくい構成です。

## 面接で聞かれそうなこと

### Q. これは DFT ですか？

いいえ。minimal-basis の extended-Hückel 型モデルです。
定量予測ではなく、反応中心の電子再配分を 3D で見せる用途です。

### Q. なぜ total density 以外も入れたのですか？

total density は原子核近傍が強く、反応変化が見えにくいからです。
差分密度と frontier orbital を切り替えられるようにしました。

### Q. 一番こだわった点は？

「名前と中身を一致させる」ことです。
今回は最初から最後まで `OH⁻ + CH₃Cl → CH₃OH + Cl⁻` の反応を扱っています。

## 次に伸ばすなら

- contracted basis への拡張
- arbitrary MO selection
- slice view の追加
- reaction definition の外部化
